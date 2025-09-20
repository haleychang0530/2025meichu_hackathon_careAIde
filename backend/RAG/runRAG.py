import os
import glob
import requests
import faiss
import numpy as np
import pickle

# ====== 設定 ======
EMBEDDING_URL = "http://localhost:8000/api/v1/embeddings"   # Lemonade Embedding API
CHAT_URL = "http://localhost:8000/api/v1/chat/completions"  # Lemonade Chat API
EMBED_MODEL = "nomic-embed-text-v2-moe-GGUF"       # 換成你部署的 embedding 模型
CHAT_MODEL = "Mistral-7B-v0.3-Instruct-Hybrid"   # 換成你在 Lemonade 跑的 LLM
MD_DIR = "./kb_md_files"     # 你的 Markdown 知識檔資料夾

# ====== 工具函式 ======

def get_embedding(text):
    payload = {"model": EMBED_MODEL, "input": text}
    res = requests.post(EMBEDDING_URL, json=payload)
    res.raise_for_status()
    return res.json()["data"][0]["embedding"]

def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def search_chunks(index, texts, query, topk=3, threshold=0.5):
    q_emb = np.array([get_embedding(query)]).astype("float32")
    D, I = index.search(q_emb, topk)
    
    results = []
    for dist, idx in zip(D[0], I[0]):
        # 如果向量已經 normalize，這裡的 dist 就是 2 - 2*cosine
        # => cosine = 1 - dist/2
        cos = 1 - dist / 2
        if cos >= threshold:
            results.append(texts[idx])
    
    return results

def build_prompt(chunks, question):
    context_text = "\n".join(chunks)
    
    if context_text == "":
        reference = """你不知道任何相關訊息，直接輸出[我不確定]"""
    else:
        reference = f"請根據下面的資料回答問題。\n【參考資料】\n {context_text}"
    
    return f"""
你是一個耐心的科技指引助手，專門幫助長輩使用電腦和手機。

{reference}

【使用者問題】
{question}

請用簡單易懂的方式回答，步驟要短句。
"""

def chat_with_llm(prompt):
    payload = {
        "model": CHAT_MODEL,
        "messages": [
            {"role": "system", "content": "你是專業的科技輔助助手"},
            {"role": "user", "content": prompt}
        ]
    }
    res = requests.post(CHAT_URL, json=payload)
    res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"]

# ====== 主程式 ======
if __name__ == "__main__":
    
    index = faiss.read_index("kb_index.faiss")
    with open("kb_text.pkl", "rb") as f:
        texts = pickle.load(f)

    while True:
        # 使用者問題
        print("輸入問題")
        question = str(input())
        
        if question == "exit":
            break

        print("\n使用者問題：", question)

        # 檢索
        chunks = search_chunks(index, texts, question, topk=3)
        print("\n找到相關資料：")
        for c in chunks:
            print("-", c[:80], "...")

        # 組 prompt
        prompt = build_prompt(chunks, question)

        # 丟給 LLM
        answer = chat_with_llm(prompt)

        print("\nAI 回答：\n", answer)