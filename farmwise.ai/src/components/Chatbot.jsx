import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Chatbot.css";
import { useTranslation } from "react-i18next";
import "../i18n";

const API_KEY = import.meta.env.VITE_GEMINI_KEY; // Store API key in .env file

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { 
      sender: "bot", 
      text: "Hello! I'm your agricultural expert assistant. How can I help you today?" 
    }
  ]);

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add event listener for audio end
  useEffect(() => {
    if (audio) {
      const handleEnded = () => {
        setIsPlaying(false);
      };
      
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audio]);

  useEffect(() => {
    // Initialize speech recognition with proper type checking and browser support
    if (typeof window !== 'undefined' && 
        (window.webkitSpeechRecognition || window.SpeechRecognition)) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = lang;

      recognition.current.onresult = (event) => {
        if (event.results && event.results[0]) {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
        }
        setIsRecording(false);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [lang]);

  const textToSpeech = useCallback(async (text) => {
    try {
      // Stop any currently playing audio first
      if (audio) {
        audio.pause();
        setAudio(null);
        // If we're already playing, just stop and return
        if (isPlaying) {
          setIsPlaying(false);
          return;
        }
      }

      const plainText = text;

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_GEMINI_TRANS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: plainText },
            voice: { languageCode: lang, ssmlGender: "NEUTRAL" },
            audioConfig: { audioEncoding: "MP3" }
          })
        }
      );

      const data = await response.json();
      const audioContent = data.audioContent;

      if (audioContent) {
        const newAudio = new Audio("data:audio/mp3;base64," + audioContent);
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);
      } else {
        console.error("No audio content received.");
      }
    } catch (error) {
      console.error("Error converting text to speech:", error);
      setIsPlaying(false);
    }
  }, [audio, isPlaying, lang]);

  const toggleAudio = () => {
    // Find the last bot message
    const botMessages = messages.filter(msg => msg.sender === "bot");
    if (botMessages.length > 0) {
      const lastBotMessage = botMessages[botMessages.length - 1];
      // Use rawText if available, otherwise use the formatted text
      const textToSpeak = lastBotMessage.text || lastBotMessage.rawText;
      textToSpeech(textToSpeak);
    }
  };

  const toggleRecording = useCallback(() => {
    if (!recognition.current) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    if (isRecording) {
      recognition.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognition.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
        setIsRecording(false);
      }
    }
  }, [isRecording]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: `You are an AI agricultural expert helping smallholder farmers. Provide clear, concise responses using markdown formatting. Use clear headings, bullet points, and highlight key information. Respond in the following language :${lang}`
                }
              ]
            },
            contents: [{ role: "user", parts: [{ text: input }] }],
            generationConfig: { maxOutputTokens: 500 }
          }),
        }
      );

      const data = await response.json();
      console.log("API Response:", data); // Debugging log

      const botResponse =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from bot";

      // Replace *text* with <b>text</b> for bold
      const formattedResponse = botResponse
        .replace(/^# (.*$)/gim, '<div class="chat-heading-1">$1</div>')
        .replace(/^## (.*$)/gim, '<div class="chat-heading-2">$1</div>')
        .replace(/^\* (.*)$/gim, '<div class="chat-list-item">$1</div>')
        .replace(/^- (.*)$/gim, '<div class="chat-list-item">$1</div>')
        .replace(/\*\*(.*?)\*\*/g, '<span class="chat-important">$1</span>')
        .replace(/\*(.*?)\*/g, '<span class="chat-italic">$1</span>')
        .replace(/\n\n/g, '<div class="chat-spacing"></div>')
        .replace(/\n/g, '<br>');

      const newBotMessage = { 
        sender: "bot", 
        text: formattedResponse,
        rawText: botResponse // Store the raw text for speech
      };
      
      setMessages((prev) => [...prev, newBotMessage]);

      // Stop any currently playing audio when new message arrives
      if (audio) {
        audio.pause();
        setAudio(null);
        setIsPlaying(false);
      }

    } catch (error) {
      console.error("Chatbot Error:", error);
      setMessages((prev) => [...prev, { 
        sender: "bot", 
        text: "Error fetching response.",
        rawText: "Error fetching response." 
      }]);
    }

    setInput("");
    setLoading(false);
  };

  return (
    <div className="chatbot-container">
      {!open && (
        <button className="chatbot-toggle" onClick={() => setOpen(true)}>
          💬
        </button>
      )}

      {open && (
        <div className="chatbot-popup">
          <div className="chatbot-header">
            <span>Agricultural Expert</span>
            <div className="header-buttons">
              <button 
                onClick={toggleAudio} 
                className="audio-toggle-btn"
                disabled={messages.filter(m => m.sender === "bot").length === 0}
                title="Text to Speech"
              >
                {isPlaying ? "🔇" : "🔊"}
              </button>
              <button className="close-btn" onClick={() => setOpen(false)}>✖</button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.sender}`}
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            ))}
            {loading && <div className="message bot">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask an agricultural question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button 
              onClick={toggleRecording} 
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
            <button onClick={sendMessage} disabled={loading}>Send</button>
            <button 
              onClick={toggleAudio} 
              className="audio-toggle-btn"
              disabled={loading || messages.filter(m => m.sender === "bot").length === 0}
            >
              {isPlaying ? "🛑" : "🔊"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;