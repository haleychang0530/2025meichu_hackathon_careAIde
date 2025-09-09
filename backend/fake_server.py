from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# 允許前端 localhost:5173 或 3000 呼叫
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/asr")
async def asr(file: UploadFile):
    print("收到 ASR 請求:", file.filename)
    return {"text": "how r u?"}

@app.post("/chat")
async def chat(query: dict):
    print("收到 Chat 請求:", query)
    return {"reply": "I am fine, thank you."}

@app.post("/tts")
async def tts(text: dict):
    print("收到 TTS 請求:", text)
    return {"audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
