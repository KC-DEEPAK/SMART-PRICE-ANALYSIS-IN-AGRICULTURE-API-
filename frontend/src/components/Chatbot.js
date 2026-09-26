import React, { useState, useEffect, useRef } from "react";
import { generateBotResponse } from "../utils/chatbotLogic";
import { useLanguage } from "../context/LanguageContext";
import "./Chatbot.css";
import { API_URL } from "../utils/api";

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [cropPriceData, setCropPriceData] = useState([]);
  
  const { lang, t } = useLanguage();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Fetch data for rule-based engine
    fetch(API_URL)
      .then(res => res.json())
      .then(json => setCropPriceData(json))
      .catch(err => console.error("Failed to fetch price data for chatbot", err));

    const handleCustomOpen = () => setIsOpen(true);
    window.addEventListener("openChatbot", handleCustomOpen);
    return () => window.removeEventListener("openChatbot", handleCustomOpen);
  }, []);

  // Initialize welcome message when language is loaded
  useEffect(() => {
    setMessages([
      { id: Date.now(), text: t.chatbotWelcome || "Hello Farmer 👋 Ask me about crop prices, fertilizer, disease, or markets.", isBot: true }
    ]);
  }, [lang, t.chatbotWelcome]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = (text = input) => {
    if (!text.trim()) return;

    const userMessage = { id: Date.now(), text, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const responseText = await generateBotResponse(text, cropPriceData);
        const botMessage = { id: Date.now() + 1, text: responseText, isBot: true };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        const botMessage = { id: Date.now() + 1, text: "Sorry, I am having trouble connecting to the server.", isBot: true };
        setMessages(prev => [...prev, botMessage]);
      } finally {
        setIsTyping(false);
      }
    }, 600); // simulate typing delay
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    
    // Map lang to speech synthesis lang
    const langMap = {
      en: "en-IN",
      kn: "kn-IN",
      hi: "hi-IN",
      ta: "ta-IN"
    };
    utter.lang = langMap[lang] || "en-IN";
    utter.rate = 0.9;
    
    window.speechSynthesis.speak(utter);
  };

  const suggestions = [
    t.chatTomatoPrice || "Tomato price?",
    t.chatOnionFertilizer || "Onion fertilizer?",
    t.chatSellAdvice || "Should I sell tomato?"
  ];

  return (
    <div className="chatbot-wrapper">
      {!isOpen && (
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>{t.chatbotTitle || "🌾 Smart Farmer Assistant"}</span>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-message ${msg.isBot ? "bot" : "user"}`}>
                {msg.text}
                {msg.isBot && (
                  <button 
                    className="chatbot-speak-btn"
                    onClick={() => speakText(msg.text)}
                    title={t.speak || "Speak"}
                  >
                    🔊
                  </button>
                )}
              </div>
            ))}
            {isTyping && <div className="typing-indicator">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-suggestions">
            {suggestions.map((suggestion, idx) => (
              <div 
                key={idx} 
                className="chatbot-suggestion-chip"
                onClick={() => handleSend(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>

          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder={t.chatbotPlaceholder || "Ask about prices, fertilizer..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="chatbot-send-btn" onClick={() => handleSend()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatbot;
