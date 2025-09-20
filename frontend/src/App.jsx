import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showLogo, setShowLogo] = useState(true);
  const [email, setEmail] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("chinese");
  const [demoMode, setDemoMode] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [showTechSteps, setShowTechSteps] = useState(false);
  const [techSteps, setTechSteps] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [currentTechMessageId, setCurrentTechMessageId] = useState(null);
  const [isLocalDemo, setIsLocalDemo] = useState(false);

  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const settingsTimerRef = useRef(null);

  const parseMarkdown = (text) => {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/^[\s]*[-*]\s(.*)$/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    text = text.replace(/^[\s]*\d+\.\s(.*)$/gim, '<li>$1</li>');
    return text;
  };

  const MessageContent = ({ text, type, messageId, isTechRelated }) => {
    if (type === 'ai') {
      return (
        <div>
          <div
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(text)
            }}
          />
          {isTechRelated && (
            <div className="tech-support-prompt">
              <button
                className="expand-steps-btn"
                onClick={() => toggleTechSteps(messageId)}
              >
                {showTechSteps && currentTechMessageId === messageId
                  ? '收起解決步驟'
                  : '📋 展開解決步驟'
                }
              </button>
            </div>
          )}
        </div>
      );
    }
    return <span>{text}</span>;
  };

  const toggleTechSteps = (messageId) => {
    if (showTechSteps && currentTechMessageId === messageId) {
      setShowTechSteps(false);
      setCurrentTechMessageId(null);
    } else {
      setShowTechSteps(true);
      setCurrentTechMessageId(messageId);
    }
  };

  const playStepVoice = (stepText) => {
    const utterance = new SpeechSynthesisUtterance(stepText);
    if (voiceLanguage === "chinese") {
      utterance.lang = "zh-TW";
    } else if (voiceLanguage === "taiwanese") {
      utterance.lang = "zh-TW";
    }
    speechSynthesis.speak(utterance);
  };

  const handleStepComplete = (stepId) => {
    setCompletedSteps(prev => {
      if (prev.includes(stepId)) {
        return prev.filter(id => id !== stepId);
      } else {
        const newCompleted = [...prev, stepId];
        if (newCompleted.length === techSteps.length && techSteps.length > 0) {
          setTimeout(() => {
            setShowTechSteps(false);
            setCurrentTechMessageId(null);
            setCompletedSteps([]);
            setTechSteps([]);
          }, 1000);
        }
        return newCompleted;
      }
    });
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

  useEffect(() => {
    return () => {
      if (settingsTimerRef.current) {
        clearTimeout(settingsTimerRef.current);
      }
    };
  }, []);

  const getTestTechSteps = () => [
    { id: 1, description: "確認設備已正確連接電源" },
    { id: 2, description: "長按電源鍵重新啟動" },
    { id: 3, description: "確認WiFi或網路線連接正常" },
    { id: 4, description: "檢查並安裝最新的軟體更新" },
    { id: 5, description: "如問題持續，請聯繫客服人員" }
  ];

  const getTestMarkdownReply = (userMessage) => {
    const testReplies = [
      `這是一個包含 **粗體文字** 和 *斜體文字* 的回覆。

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

  const handleDemoSend = (text, isTechStepRequest = false, stepIndex = null) => {
    if (!text.trim()) return;

    if (messages.length === 0) {
      setShowLogo(false);
    }

    const userMessageText = isTechStepRequest ? `關於第 ${stepIndex + 1} 步：${text}` : text;
    setMessages((prev) => [...prev, { type: "user", text: userMessageText, id: Date.now() }]);

    setIsAiThinking(true);

    // 處理技術步驟詢問的邏輯
    if (isTechStepRequest) {
      setTimeout(() => {
        setIsAiThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            text: `好的，關於步驟 ${stepIndex + 1} 的問題，我會提供更詳細的說明。請您再試試看：**${text}**。`,
            id: Date.now() + 1
          },
        ]);
        // 保持技術步驟面板開啟
        setShowTechSteps(true);
      }, 1500);
      return;
    }

    const isTechQuestion = text.toLowerCase().includes('電腦') ||
      text.toLowerCase().includes('網路') ||
      text.toLowerCase().includes('手機') ||
      text.toLowerCase().includes('問題') ||
      text.toLowerCase().includes('故障') ||
      text.includes('技術');

    if (isTechQuestion) {
      setTimeout(() => {
        setIsAiThinking(false);
        const aiMessageId = Date.now() + 1;
        setMessages((prev) => [...prev, {
          type: "ai",
          text: "我了解您遇到了技術問題。讓我為您提供一些解決步驟，您可以按照順序嘗試。",
          id: aiMessageId,
          isTechRelated: true
        }]);
        setTechSteps(getTestTechSteps());
        setCompletedSteps([]);
        setCurrentTechMessageId(aiMessageId);
      }, 1500);
      return;
    }

    if (text.toLowerCase().includes('markdown') || text.includes('測試')) {
      setTimeout(() => {
        setIsAiThinking(false);
        setMessages((prev) => [...prev, {
          type: "ai",
          text: getTestMarkdownReply(text),
          id: Date.now() + 1
        }]);
      }, 1500);
      return;
    }

    setTimeout(() => {
      setIsAiThinking(false);
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "這是一個非技術類問題的通用回覆。", id: Date.now() + 1 },
      ]);
    }, 1500);
  }


  const handleSend = async (text, isTechStepRequest = false, stepIndex = null) => {
    if (!text.trim()) return;

    if (isLocalDemo) {
      handleDemoSend(text, isTechStepRequest, stepIndex);
      return;
    }

    if (messages.length === 0) {
      setShowLogo(false);
    }

    const messageId = Date.now();
    const userMessageText = isTechStepRequest ? `關於第 ${stepIndex + 1} 步：${text}` : text;
    setMessages((prev) => [...prev, { type: "user", text: userMessageText, id: messageId }]);

    setIsAiThinking(true);

    try {
      const apiUrl = isTechStepRequest ? "http://localhost:5000/tech-ai" : "http://localhost:5000/ai";
      const requestBody = isTechStepRequest ?
      { step_index: stepIndex, question: text } :
      { message: text };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      setIsAiThinking(false);
      const aiMessageId = Date.now() + 1;

      let isTechRelated = data.class === 1;

      setMessages((prev) => [...prev, {
        type: "ai",
        text: data.reply,
        id: aiMessageId,
        isTechRelated: isTechRelated
      }]);

      if (isTechRelated) {
        const techStepsData = data.tech_steps || getTestTechSteps();
        setTechSteps(techStepsData);
        setCompletedSteps([]);
        setCurrentTechMessageId(aiMessageId);
      }

    } catch (err) {
      setIsAiThinking(false);
      setMessages((prev) => [
        ...prev,
        { type: "ai", text: "抱歉，我暫時無法回覆 😢", id: Date.now() + 1 },
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
    handleSend(inputText);
    setInputText("");
  };

  const playVoice = (text) => {
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (voiceLanguage === "chinese") {
      utterance.lang = "zh-TW";
    } else if (voiceLanguage === "taiwanese") {
      utterance.lang = "zh-TW";
    }
    speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    speechSynthesis.cancel();
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      alert("請輸入有效的 Gmail 地址");
      return;
    }
    try {
      if (demoMode) {
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

  const resetAutoCloseTimer = () => {
    if (settingsTimerRef.current) {
      clearTimeout(settingsTimerRef.current);
    }
    settingsTimerRef.current = setTimeout(() => {
      setShowSettings(false);
      settingsTimerRef.current = null;
    }, 5000);
  };

  const handlePanelInteraction = () => {
    resetAutoCloseTimer();
  };

  const toggleSettings = () => {
    if (showSettings) {
      if (settingsTimerRef.current) {
        clearTimeout(settingsTimerRef.current);
        settingsTimerRef.current = null;
      }
      setShowSettings(false);
    } else {
      setShowSettings(true);
      resetAutoCloseTimer();
    }
  };

  return (
    <div className="app-container">
      <div className="settings-icon" onClick={toggleSettings}>
        ⚙️
      </div>
      {showSettings && (
        <div className="settings-panel" onMouseEnter={handlePanelInteraction} onClick={handlePanelInteraction}>
          <h3>設定</h3>
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
          <div className="demo-mode">
            <label>
              <input
                type="checkbox"
                checked={isLocalDemo}
                onChange={(e) => {
                  setIsLocalDemo(e.target.checked);
                  handlePanelInteraction();
                }}
              />
              📦 本地模擬測試
            </label>
          </div>
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
      {showTechSteps && (
        <div className="tech-steps-panel">
          <div className="tech-steps-header">
            <h3>🔧 解決步驟</h3>
            <button
              className="close-steps-btn"
              onClick={() => setShowTechSteps(false)}
            >
              ✕
            </button>
          </div>
          <div className="tech-steps-list">
            {techSteps.map((step, index) => (
              <div
                key={step.id}
                className={`tech-step ${completedSteps.includes(step.id) ? 'completed' : ''}`}
              >
                <div className="step-checkbox">
                  <input
                    type="checkbox"
                    id={`step-${step.id}`}
                    checked={completedSteps.includes(step.id)}
                    onChange={() => handleStepComplete(step.id)}
                  />
                  <label htmlFor={`step-${step.id}`}></label>
                </div>
                <div className="step-content">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-details">
                    <p>{step.description}</p>
                  </div>
                </div>
                <button
                  className="step-voice-btn"
                  onClick={() => playStepVoice(`${step.description}`)}
                >
                  🔊
                </button>
                <button
                  className="ask-ai-btn"
                  onClick={() => {
                    const questionPrefix = `關於步驟 ${index + 1}：`;
                    setInputText(questionPrefix);
                  }}
                >
                  詢問 AI
                </button>
              </div>
            ))}
          </div>
          {completedSteps.length === techSteps.length && techSteps.length > 0 && (
            <div className="completion-message">
              🎉 所有步驟已完成！列表將自動收起...
            </div>
          )}
        </div>
      )}
      <div className={`logo-container ${!showLogo ? "fade-out" : ""}`}>
        <h1>
          Care<span className="highlight-ai">AI</span>de
        </h1>
      </div>
      <div className="chat-container" ref={chatContainerRef}>
        <div className="message-row left">
          <div className="message-bubble ai">
            你好，我是你的技術助手 😊
            <div className="voice-buttons">
              <button className="play-button" onClick={() => playVoice('你好，我是你的技術助手')}>
                🔊 播放
              </button>
            </div>
          </div>
        </div>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.type === "user" ? "right" : "left"}`}
          >
            <div className={`message-bubble ${msg.type}`}>
              <MessageContent
                text={msg.text}
                type={msg.type}
                messageId={msg.id}
                isTechRelated={msg.isTechRelated}
              />
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
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              const techStepQuestionMatch = inputText.match(/^關於步驟 (\d+) \((.*?)\)：/);
              if (techStepQuestionMatch) {
                const stepIndex = parseInt(techStepQuestionMatch[1], 10) - 1;
                const questionText = inputText.substring(techStepQuestionMatch[0].length).trim();
                handleSend(questionText, true, stepIndex);
              } else {
                handleInputSend();
              }
              setInputText("");
            }
          }}
          placeholder="輸入訊息..."
          className="text-input"
          disabled={isAiThinking}
        />
        <button
          onClick={() => {
            const techStepQuestionMatch = inputText.match(/^關於步驟 (\d+)：/);
            if (techStepQuestionMatch) {
              const stepIndex = parseInt(techStepQuestionMatch[1], 10) - 1;
              const questionText = inputText.substring(techStepQuestionMatch[0].length).trim();
              handleSend(questionText, true, stepIndex);
            } else {
              handleInputSend();
            }
            setInputText("");
          }}
          disabled={isAiThinking}
        >
          傳送文字
        </button>
        <button
          onClick={handleVoiceInput}
          className={listening ? "recording" : ""}
          disabled={isAiThinking}
        >
          開始錄音
        </button>
      </div>
    </div>
  );
}