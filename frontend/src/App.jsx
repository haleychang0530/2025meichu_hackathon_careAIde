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
  const [isAiThinking, setIsAiThinking] = useState(false); // 新增：AI思考狀態
  const chatContainerRef = useRef(null); // 用於滾動到底部
  const recognitionRef = useRef(null);
  const settingsTimerRef = useRef(null); // 用於儲存設定面板自動關閉的計時器

  // 簡單的 Markdown 解析函數
  const parseMarkdown = (text) => {
    // 處理粗體 **text** 或 __text__
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // 處理斜體 *text* 或 _text_
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // 處理程式碼區塊 ```code```
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // 處理行內程式碼 `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 處理標題 # ## ###
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // 處理連結 [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 處理換行
    text = text.replace(/\n/g, '<br>');
    
    // 處理無序列表 - item 或 * item
    text = text.replace(/^[\s]*[-*]\s(.*)$/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 處理有序列表 1. item
    text = text.replace(/^[\s]*\d+\.\s(.*)$/gim, '<li>$1</li>');
    
    return text;
  };

  // 渲染訊息內容的組件
  const MessageContent = ({ text, type }) => {
    if (type === 'ai') {
      return (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: parseMarkdown(text) 
          }} 
        />
      );
    }
    return <span>{text}</span>;
  };

  // 滾動到底部的函數
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 當訊息更新時，自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]); // 新增isAiThinking依賴，讓加載動畫出現時也滾動

  // 清理計時器的副作用
  useEffect(() => {
    return () => {
      if (settingsTimerRef.current) {
        clearTimeout(settingsTimerRef.current);
      }
    };
  }, []);

  // 測試用的 Markdown 回覆
  const getTestMarkdownReply = (userMessage) => {
    const testReplies = [
      `這是一個包含 **粗體文字** 和 *斜體文字1abc* 的回覆。

# 主標題
## 副標題
### 小標題

這裡有一些程式碼：\`console.log("Hello World")\`

以及程式碼區塊：
\`\`\`javascript
function greet(name) {
  return "Hello, " + name + "!";
}
\`\`\`

還有一個連結：[Google](https://www.google.com)

以及列表：
- 項目一
- 項目二
- 項目三`,

      `我可以幫你解決技術問題！這裡是一些常見的解決方案：

## 常見問題解決步驟

1. **檢查網路連線**
2. *重新啟動裝置*
3. 清除快取資料

\`\`\`bash
# 清除快取的指令
rm -rf ~/.cache
\`\`\`

更多資訊請參考：[技術支援文件](https://example.com)`,

      `**解答：** 根據您的問題，我建議您：

### 步驟一：基本檢查
- 確認 \`設定\` 是否正確
- 檢查 **系統狀態**

### 步驟二：進階處理
\`\`\`
sudo systemctl restart service
\`\`\`

*希望這個回答對您有幫助！*`
    ];
    
    return testReplies[Math.floor(Math.random() * testReplies.length)];
  };

  const handleSend = async (text) => {
    if (!text.trim()) return;

    // 如果是第一則訊息，觸發 Logo 漸隱效果
    if (messages.length === 0) {
      setShowLogo(false);
    }

    // 加入使用者訊息
    setMessages((prev) => [...prev, { type: "user", text }]);

    // AI思考狀態
    setIsAiThinking(true);

    // 測試模式：如果輸入包含 "markdown" 或 "測試"，回傳測試 markdown
    if (text.toLowerCase().includes('markdown') || text.includes('測試')) {
      setTimeout(() => {
        setIsAiThinking(false);
        setMessages((prev) => [...prev, { 
          type: "ai", 
          text: getTestMarkdownReply(text)
        }]);
      }, 1500); // 模擬思考時間
      return;
    }

    // 呼叫假後端
    try {
      const response = await fetch("http://localhost:5000/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      
      // 結束AI思考狀態並加入AI回覆
      setIsAiThinking(false);
      setMessages((prev) => [...prev, { type: "ai", text: data.reply }]);
    } catch (err) {
      // 發生錯誤時也要結束思考狀態
      setIsAiThinking(false);
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
    // 移除 HTML 標籤，只讀純文字
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
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

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      alert("請輸入有效的 Gmail 地址");
      return;
    }
    
    try {
      if (demoMode) {
        // Demo 模式：調用 /send_email 接口
        const response = await fetch("http://localhost:5000/send_email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email }),
        });
        const data = await response.json();
        
        if (data.status === "success") {
          alert(`🎬 Demo 模式：已成功發送至 ${email}\n\n功能展示完成！`);
        } else {
          alert("發送失敗，請稍後再試");
        }
        console.log("Demo 模式 - 發送報告到:", email);
        console.log("對話內容:", messages);
      } else {
        // 一般模式：調用 /change_email_address 接口
        const response = await fetch("http://localhost:5000/change_email_address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_email: email }),
        });
        const data = await response.json();
        
        if (data.status === "success") {
          alert(`Email 地址已成功更新為: ${email}`);
        } else {
          alert("更新失敗，請稍後再試");
        }
        console.log("更新 Email 地址:", email);
      }
    } catch (error) {
      console.error("API 調用失敗:", error);
      alert("網路錯誤，請檢查連線後再試");
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
              <MessageContent text={msg.text} type={msg.type} />
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

        {/* AI思考中的加載動畫 */}
        {isAiThinking && (
          <div className="message-row left">
            <div className="message-bubble ai thinking">
              <div className="thinking-indicator">
                <div className="spinner"></div>
                <span className="thinking-text">思考中...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)} // 更新輸入框的文字
          onKeyPress={(e) => e.key === 'Enter' && handleInputSend()} // 按 Enter 發送
          placeholder="輸入訊息..."
          className="text-input"
          disabled={isAiThinking} // AI思考時禁用輸入
        />
        <button 
          onClick={handleInputSend}
          disabled={isAiThinking} // AI思考時禁用按鈕
        >
          傳送文字
        </button>
        <button
          onClick={handleVoiceInput}
          className={listening ? "recording" : ""}
          disabled={isAiThinking} // AI思考時禁用語音輸入
        >
          開始錄音
        </button>
      </div>
    </div>
  );
}