import { useState, useRef } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([
    { type: "ai", text: "你好，我是你的技術助手 😊" },
  ]);
  const [listening, setListening] = useState(false);
  const [inputText, setInputText] = useState(""); // 新增狀態來儲存輸入框的文字
  const recognitionRef = useRef(null);

  const handleSend = async (text) => {
    if (!text.trim()) return;

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

  // 語音錄入
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

  // 處理輸入框的文字發送
  const handleInputSend = () => {
    handleSend(inputText); // 發送輸入框的文字
    setInputText(""); // 清空輸入框
  };

  return (
    <div className="app-container">
      <div className="chat-container">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.type === "user" ? "left" : "right"}`}
          >
            <div className={`message-bubble ${msg.type}`}>
              {msg.text}
              {msg.type === "ai" && (
                <button
                  className="play-button"
                  onClick={() => {
                    const utter = new SpeechSynthesisUtterance(msg.text);
                    speechSynthesis.speak(utter);
                  }}
                >
                  🔊
                </button>
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
          🗨️ 開始錄音
        </button>
      </div>
    </div>
  );
}