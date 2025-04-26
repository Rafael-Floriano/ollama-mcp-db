
import express from 'express';
import { OllamaMCPHost } from './OllamaMCPHost.js';

const app = express();
app.use(express.json());

const ollamaHost = new OllamaMCPHost();

app.post('/ask', async (req, res) => {
  const { question } = req.body;
  try {
    const response = await ollamaHost.processQuestion(question);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('MCP Server rodando na porta 3001');
});
