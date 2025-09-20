import os
import glob
import requests
import faiss
import numpy as np
import pickle

# ====== 設定 ======
EMBEDDING_URL = "http://localhost:8000/api/v1/embeddings"   # Lemonade Embedding API
EMBED_MODEL = "nomic-embed-text-v2-moe-GGUF"       # 換成你部署的 embedding 模型
MD_DIR = "./kb_md_files"     # 你的 Markdown 知識檔資料夾

# ====== 工具函式 ======
def load_md_chunks(md_dir, max_chars=500):
    """
    讀取所有 .md 檔，並切成 chunks (避免太長影響 embedding)
    """
    files = glob.glob(os.path.join(md_dir, "*.md"))
    texts = []
    for f in files:
        with open(f, "r", encoding="utf-8") as fp:
            content = fp.read()
        # 簡單用段落切
        chunk, length = [], 0
        for line in content.splitlines():
            if length + len(line) > max_chars and chunk:
                texts.append(" ".join(chunk))
                chunk, length = [], 0
            chunk.append(line.strip())
            length += len(line)
        if chunk:
            texts.append(" ".join(chunk))
    return texts

def get_embedding(text):
    payload = {"model": EMBED_MODEL, "input": text}
    res = requests.post(EMBEDDING_URL, json=payload)
    res.raise_for_status()
    return res.json()["data"][0]["embedding"]

def build_index(texts):
    embeddings = [get_embedding(t) for t in texts]
    embeddings = np.array(embeddings).astype("float32")
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index, texts

# ====== 主程式 ======
if __name__ == "__main__":
    
    print("讀取 Markdown 知識庫...")
    texts = load_md_chunks(MD_DIR)
    print(f"共讀取 {len(texts)} 個 chunks")

    print("建立 FAISS Index...")
    index, texts = build_index(texts)
    print("完成 ✅")
    
    faiss.write_index(index, "kb_index.faiss")
    with open("kb_text.pkl", "wb") as f:
        pickle.dump(texts, f)
    