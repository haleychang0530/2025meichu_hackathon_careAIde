import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]); // 初始訊息不包含 AI 的第一句話
  const [listening, setListening] = useState(false);
  const [inputText, setInputText] = useState(""); // 儲存輸入框的文字
  const [showLogo, setShowLogo] = useState(true); // 控制 Logo 是否顯示
  const chatContainerRef = useRef(null); // 用於滾動到底部
  const recognitionRef = useRef(null);

  // 滾動到底部的函數
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 當訊息更新時，自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    // 如果是第一則訊息，觸發 Logo 漸隱效果
    if (messages.length === 0) {
      setShowLogo(false);
    }

    // 加入使用者訊息
    setMessages((prev) => [...prev, { type: "user", text }]);

    // 呼叫假後端
    try {
      const response = await fetch("http://localhost:5000/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { type: "ai", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "抱歉，我暫時無法回覆 😢" },
      ]);
    }
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("你的瀏覽器不支援語音辨識");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = "zh-TW";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setListening(false);
      };

      recognitionRef.current = recognition;
    }

    if (!listening) {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const handleInputSend = () => {
    handleSend(inputText); // 發送輸入框的文字
    setInputText(""); // 清空輸入框
  };

  const playVoice = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW"; // 設定語言為繁體中文
    speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    speechSynthesis.cancel(); // 停止語音播放
  };

  return (
    <div className="app-container">
      {/* CareAIde Logo */}
      <div className={`logo-container ${!showLogo ? "fade-out" : ""}`}>
        <h1>
          Care<span className="highlight-ai">AI</span>de
        </h1>
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {/* AI 預設的第一句話 */}
        <div className="message-row left">
          <div className="message-bubble ai">
            你好，我是你的技術助手 😊
          </div>
        </div>

        {/* 動態訊息 */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.type === "user" ? "right" : "left"}`}
          >
            <div className={`message-bubble ${msg.type}`}>
              {msg.text}
              {msg.type === "ai" && (
                <div className="voice-buttons">
                  <button
                    className="play-button"
                    onClick={() => playVoice(msg.text)}
                  >
                    🔊 播放
                  </button>
                  <button
                    className="stop-button"
                    onClick={stopVoice}
                  >
                    ⏹ 停止
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)} // 更新輸入框的文字
          placeholder="輸入訊息..."
          className="text-input"
        />
        <button onClick={handleInputSend}>傳送文字</button>
        <button
          onClick={handleVoiceInput}
          className={listening ? "recording" : ""}
        >
          開始錄音
        </button>
      </div>
    </div>
  );
}