const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// 允許跨域
app.use(cors());

// 解析 JSON
app.use(express.json());

app.post("/ai", (req, res) => {
  const userMessage = req.body.message;
  console.log("收到使用者訊息:", userMessage);

  const reply = `我收到你的訊息: "${userMessage}"`;
  res.json({ reply });
});

app.listen(PORT, () => {
  console.log(`假後端已啟動：http://localhost:${PORT}`);
});
