## CareAIde: The Tech-Assistant for the Elderly
2025 Mei-Chu Hackathon-AMD#04 

![LOGO](/frontend/public/LOGO.png)

## Introduction

**CareAIde: Care your mom and dad**

CareAIde helps the elderly to solve problems relative to technology in their daily life.

The whole project is deployed locally, using lemonade server to run LLM and embedding models.

## Models
LLM: `Mistral-7B-v0.3-Instruct-Hybrid`

Embedding: `nomic-embed-text-v2-moe-GGUF`

Taiwanese to Chinese Speech-to-Text: `NUTN-KWS/Whisper-Taiwanese-model-v0.5`

Chinese to Chinese Speech-to-Text: `MediaTek-Research/Breeze-ASR-25`

Chinese to Chinese Text-to-Speech: `gTTS`

Chinese to Taiwanese Text-to-Speech: `gTTS`

## Run Project
run on two terminal
### frontend
```
cd frontend
npm run dev
```
### backend
```
python backend/app.py
```
## Key features
1. Bilingual speech input and output\
   In this project, we support Taiwanese and Chinese speech recognition, plus Chinese and Taiwanese speech synthesis. reducing the need for typing and making interactions more accessible for older users.
 
2. RAG knowledge base\
   We establish a RAG knowledge base featuring jokes and everyday phrases written in natural, colloquial language, deliverling more precise and easy-to-understand replies.
3. Run on local\
   Running all models on local device, preserving privacy, and delivering efficient and stable performance.
4. Intuitive interface for elderly\
    We use Larger texts, clear layout and harmonious  colors make the interface easy to use.
5. Daily user report\
    We send daily user report to user and their carer via Gmail, summarizing the latest status of the elders and making it easier to track well-being.
6. Auto-detect conversation \
    Our model can detect the topic of the query, and adjust the tone and response style accordingly

