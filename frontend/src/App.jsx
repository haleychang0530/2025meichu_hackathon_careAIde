import React, { useState, useRef } from "react";

function App() {
  const [recording, setRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 開始錄音
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  // 停止錄音並送到後端
  const stopRecording = async () => {
    mediaRecorderRef.current.stop();
    setRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", audioBlob, "input.wav");

      // 呼叫 ASR API
      const res = await fetch("http://localhost:8000/asr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setRecognizedText(data.text);

      // 呼叫 Chat API
      const chatRes = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: data.text }),
      });
      const chatData = await chatRes.json();
      setAiReply(chatData.reply);

      // 呼叫 TTS API
      const ttsRes = await fetch("http://localhost:8000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatData.reply }),
      });
      const ttsData = await ttsRes.json();
      setAudioUrl(ttsData.audioUrl);
    };
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>👵 AI Tech Support for Seniors</h1>

      {/* 錄音按鈕 */}
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "停止錄音" : "開始錄音"}
      </button>

      {/* 顯示辨識文字 */}
      {recognizedText && (
        <p>
          <b>你說：</b> {recognizedText}
        </p>
      )}

      {/* 顯示 AI 回答 */}
      {aiReply && (
        <p>
          <b>AI 回答：</b> {aiReply}
        </p>
      )}

      {/* 播放 AI 語音 */}
      {audioUrl && (
        <audio controls src={audioUrl} autoPlay />
      )}
    </div>
  );
}

export default App;
