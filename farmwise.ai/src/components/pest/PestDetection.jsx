import React, { useState, useEffect,useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../../i18n";
import "./pest.css"

const PestDetection = () => {
  const { t, i18n } = useTranslation();
  const [photo, setPhoto] = useState([]);
  const [load, setLoad] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [botResponse, setBotResponse] = useState("");
   const [loading, setLoading] = useState(false);
   const [audio, setAudio] = useState(null);
  const lang = i18n.language;

  let url = "https://farmwise-service-503341378134.us-central1.run.app/detect-pests";
  let form = new FormData();
  form.append("file", photo[0]);

  function onClick() {
    try {
      setLoad(true);
      fetch(url, {
        method: "POST",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: form,
      })
        .then((response) => response.json())
        .then((data) => {
          let main_data = data;
          const detectedPests = main_data["detected_pests"];
          setPrediction(detectedPests.join(", "));
          
          // Check if there are any detected pests and call Gemini API for explanation
          if (detectedPests.length > 0) {
            callGeminiAPI(detectedPests.join(", "));
          } else {
            setBotResponse(t("no_pests_detected"));
          }

        })
        .catch((error) => {
          console.log(error);
          setPrediction(t("error_fetching"));
        })
        .finally(() => setLoad(false));
    } catch (e) {
      console.log(e);
      setLoad(false);
      setPrediction(t("unexpected_error"));
    }
  }

  async function callGeminiAPI(detectedPests) {
    setLoading(true);
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
                parts: [
                  {
                    text: `The detected pests are: ${detectedPests}. Explain the causes and cures for these pests in detail.`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 200,
            },
          }),
        }
      );

      const data = await response.json();
      const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || t("no_ai_response");
      setBotResponse(botResponse);
      translateAndFormat(botResponse);
    } catch (error) {
      console.error("Error fetching explanation from Gemini API:", error);
      setBotResponse(t("ai_error"));
      setLoading(false);
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
              <p className="prediction-title">{t("pest_prediction")}</p>
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


export default PestDetection;
