import React, { useState, useEffect,useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../../i18n";
import "./disease.css";

const Disease = () => {
  const { t,i18n } = useTranslation();
  const [photo, setPhoto] = useState([]);
  const [load, setLoad] = useState(false);
   const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [botResponse, setBotResponse] = useState("");
    const [audio, setAudio] = useState(null);
  const lang=i18n.language;
  function onClick() {
    setLoad(true);
    let url = "https://farmwise-service-503341378134.us-central1.run.app/predict-disease";
    let form = new FormData();
    form.append("file", photo[0]);

    fetch(url, {
      method: "POST",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: form,
    })
      .then((response) => response.json())
      .then((data) => {
        let main_data = data["prediction"];
        setPrediction(`Crop: ${main_data["crop"]}, Condition: ${main_data["condition"]}`);

        if (main_data["condition"] !== "healthy") {
          callGeminiAPI(main_data["class_name"]); // Fetch explanation only for diseases
        } else {
          setBotResponse(t("healthy_message")); // Message for healthy crops
        }
      })
      .catch((error) => console.log(error))
      .finally(() => setLoad(false));
  }

  async function callGeminiAPI(diseasePrediction) {
    setLoading(true); // Set loading state when calling the API
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `This is the disease: ${diseasePrediction}. Explain the cause and cure of the disease precisely.` }],
              },
            ],
            generationConfig: { maxOutputTokens: 150 },
          }),
        }
      );
      const data = await response.json();
      const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from bot";
      const formattedResponse = botResponse
      .replace(/^# (.*$)/gim, '<div class="chat-heading-1">$1</div>')
      .replace(/^## (.*$)/gim, '<div class="chat-heading-2">$1</div>')
      .replace(/^\* (.*)$/gim, '<div class="chat-list-item">$1</div>')
      .replace(/^- (.*)$/gim, '<div class="chat-list-item">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<span class="chat-important">$1</span>')
      .replace(/\*(.*?)\*/g, '<span class="chat-italic">$1</span>')
      .replace(/\n\n/g, '<div class="chat-spacing"></div>')
      .replace(/\n/g, '<br>');
    
    setBotResponse(formattedResponse);
    translateAndFormat(botResponse);
    } catch (error) {
      console.error("Error fetching explanation from Gemini API:", error);
      setLoading(false); // Reset loading state on error
    }

  }

const translateAndFormat = useCallback(async (text) => {
    try {
      // First translate the text
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${import.meta.env.VITE_GEMINI_TRANS}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, target: lang })
        }
      );
      const data = await response.json();
      const translatedText = data?.data?.translations?.[0]?.translatedText || text;
      
      // Then format the translated text
      const formattedResponse = translatedText
        .replace(/^# (.*$)/gim, '<div class="chat-heading-1">$1</div>')
        .replace(/^## (.*$)/gim, '<div class="chat-heading-2">$1</div>')
        .replace(/^\* (.*)$/gim, '<div class="chat-list-item">$1</div>')
        .replace(/^- (.*)$/gim, '<div class="chat-list-item">$1</div>')
        .replace(/\*\*(.*?)\*\*/g, '<span class="chat-important">$1</span>')
        .replace(/\*(.*?)\*/g, '<span class="chat-italic">$1</span>')
        .replace(/\n\n/g, '<div class="chat-spacing"></div>')
        .replace(/\n/g, "<br>");
      
      // Set the formatted response
      setBotResponse(formattedResponse);
    } catch (error) {
      console.error("Error translating text:", error);
      // If translation fails, format the original text
      const formattedResponse = text
        .replace(/^# (.*$)/gim, '<div class="chat-heading-1">$1</div>')
        .replace(/^## (.*$)/gim, '<div class="chat-heading-2">$1</div>')
        .replace(/^\* (.*)$/gim, '<div class="chat-list-item">$1</div>')
        .replace(/^- (.*)$/gim, '<div class="chat-list-item">$1</div>')
        .replace(/\*\*(.*?)\*\*/g, '<span class="chat-important">$1</span>')
        .replace(/\*(.*?)\*/g, '<span class="chat-italic">$1</span>')
        .replace(/\n\n/g, '<div class="chat-spacing"></div>')
        .replace(/\n/g, "<br>");
      
      setBotResponse(formattedResponse);
    } finally {
      setLoading(false);
    }
  }, [lang]);
  const textToSpeech = useCallback(
    async (text, language) => {
      try {
        if (audio) {
          audio.pause();
          setAudio(null);
        }

        // Create a temporary div element to extract text content from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const plainText = tempDiv.textContent || tempDiv.innerText || text;

        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_GEMINI_TRANS}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text: plainText },
              voice: { languageCode: language, ssmlGender: "NEUTRAL" },
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
        } else {
          console.error("No audio content received.");
        }
      } catch (error) {
        console.error("Error converting text to speech:", error);
      }
    },
    [audio]
  );


    // Effect to re-translate when language changes
    useEffect(() => {
      // Only re-translate if we have an original response stored
      if (botResponse) {
        setLoading(true);
        translateAndFormat(botResponse);
      }
    }, [lang, botResponse, translateAndFormat]);

  return (
    <>
      
      <section className="bg-gray-100 py-14 min-h-screen flex items-center justify-center">
        <div className="container bg-white p-10 rounded-lg shadow-xl glass-effect w-full max-w-lg">
          <div className="text-center mb-10">
            <p className="text-3xl font-bold text-green-600">{t("upload_title")}</p>
            <p className="text-lg text-gray-600 mt-2">{t("upload_subtitle")}</p>
          </div>
          <input type="file" id="fileUpload" onChange={(e) => setPhoto([e.target.files[0]])} className="file-input" />
          <label htmlFor="fileUpload" className="file-label">📁 <span>{t("select_image")}</span></label>
          {photo.length > 0 && <p className="file-name">📄 {photo[0].name}</p>}
          {photo.length > 0 && <img src={URL.createObjectURL(photo[0])} alt="Uploaded" className="image-preview mt-4" />}
          <button onClick={onClick} className="submit-btn">{t("get_results")}</button>
          
          {load ? <p className="text-lg text-green-600">{t("loading")}</p> : prediction && (
            <div className="prediction-box">
              <p className="prediction-title">{t("disease_prediction")}</p>
              <p className="prediction-result">{prediction}</p>
            </div>
          )}
          {botResponse && (
            <div className="bot-response mt-6">
              <p className="text-xl font-semibold text-green-600">{t("ai_explanation")}</p>
              <p className="text-center" dangerouslySetInnerHTML={{ __html: botResponse }} />
              <button
                onClick={() => textToSpeech(botResponse, lang)}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              >
                🔊
              </button>
              {"   "}
              <button
                onClick={() => {
                  if (audio) {
                    audio.pause();
                    setAudio(null);
                  }
                }}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                ⏹️
              </button>
            </div>
          )}
          {loading && (
            <p className="text-center text-green-600">
              AI is processing your request...
            </p>
          )}
        </div>
      </section>

    </>
  );
};

export default Disease;
