
import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]); // 初始訊息不包含 AI 的第一句話
  const [listening, setListening] = useState(false);
  const [inputText, setInputText] = useState(""); // 儲存輸入框的文字
  const [showLogo, setShowLogo] = useState(true); // 控制 Logo 是否顯示
  const [email, setEmail] = useState(""); // 儲存 Gmail
  const [showSettings, setShowSettings] = useState(false); // 控制設定面板顯示
  const [voiceLanguage, setVoiceLanguage] = useState("chinese"); // 語音輸出語言選擇
  const [demoMode, setDemoMode] = useState(false); // Demo 模式開關
  const chatContainerRef = useRef(null); // 用於滾動到底部
  const recognitionRef = useRef(null);
  const settingsTimerRef = useRef(null); // 用於儲存設定面板自動關閉的計時器

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

  // 清理計時器的副作用
  useEffect(() => {
    return () => {
      if (settingsTimerRef.current) {
        clearTimeout(settingsTimerRef.current);
      }
    };
  }, []);

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
    
    // 根據選擇的語言設定
    if (voiceLanguage === "chinese") {
      utterance.lang = "zh-TW"; // 設定語言為繁體中文
    } else if (voiceLanguage === "taiwanese") {
      // 未來會串接台語 AI，現在使用中文作為替代
      utterance.lang = "zh-TW"; 
      // 可以在這裡添加特殊處理或標記，未來串接台語 AI 時使用
    }
    
    speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    speechSynthesis.cancel(); // 停止語音播放
  };

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      alert("請輸入有效的 Gmail 地址");
      return;
    }
    
    // Demo 模式下的報告發送
    if (demoMode) {
      alert(`🎬 Demo 模式：技術支援報告已模擬發送至 ${email}\n\n功能展示完成！`);
      console.log("Demo 模式 - 模擬發送報告到:", email);
      console.log("對話內容:", messages);
    } else {
      // 一般模式
      alert(`模擬發送內容到 Gmail: ${email}\n\n對話內容已準備發送！`);
      console.log("準備發送的對話內容:", messages);
    }
  };

  // 重置自動關閉計時器
  const resetAutoCloseTimer = () => {
    if (settingsTimerRef.current) {
      clearTimeout(settingsTimerRef.current);
    }
    settingsTimerRef.current = setTimeout(() => {
      setShowSettings(false);
      settingsTimerRef.current = null;
    }, 5000); // 延長到5秒，給老人更多操作時間
  };

  // 處理面板內的操作，重置計時器
  const handlePanelInteraction = () => {
    resetAutoCloseTimer();
  };

  const toggleSettings = () => {
    if (showSettings) {
      // 手動關閉時清除計時器
      if (settingsTimerRef.current) {
        clearTimeout(settingsTimerRef.current);
        settingsTimerRef.current = null;
      }
      setShowSettings(false);
    } else {
      // 開啟面板時，啟動自動關閉計時器
      setShowSettings(true);
      resetAutoCloseTimer();
    }
  };

  return (
    <div className="app-container">
      {/* 齒輪圖標 */}
      <div className="settings-icon" onClick={toggleSettings}>
        ⚙️
      </div>

      {/* 設定面板 */}
      {showSettings && (
        <div className="settings-panel" onMouseEnter={handlePanelInteraction} onClick={handlePanelInteraction}>
          <h3>設定</h3>
          
          {/* Demo 模式開關 */}
          <div className="demo-mode">
            <label>
              <input 
                type="checkbox" 
                checked={demoMode}
                onChange={(e) => {
                  setDemoMode(e.target.checked);
                  handlePanelInteraction();
                }}
              />
              🎬 黑客松 Demo 模式
            </label>
          </div>

          {/* Gmail 輸入框 */}
          <div className="email-input">
            <label>子女 Gmail 信箱：</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                handlePanelInteraction();
              }}
              onFocus={handlePanelInteraction}
              placeholder="輸入 Gmail 地址"
            />
            <button onClick={() => {
              handleEmailSubmit();
              handlePanelInteraction();
            }}>
              {demoMode ? "🎬 模擬發送報告" : "提交"}
            </button>
          </div>
          
          {/* 語音輸出選擇 */}
          <div className="voice-output">
            <label>語音輸出語言：</label>
            <div className="voice-toggle">
              <button 
                className={`toggle-btn ${voiceLanguage === "chinese" ? "active" : ""}`}
                onClick={() => {
                  setVoiceLanguage("chinese");
                  handlePanelInteraction();
                }}
              >
                中文
              </button>
              <button 
                className={`toggle-btn ${voiceLanguage === "taiwanese" ? "active" : ""}`}
                onClick={() => {
                  setVoiceLanguage("taiwanese");
                  handlePanelInteraction();
                }}
              >
                台語
              </button>
            </div>
          </div>
        </div>
      )}

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
                    ⏹停止
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
          onKeyPress={(e) => e.key === 'Enter' && handleInputSend()} // 按 Enter 發送
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