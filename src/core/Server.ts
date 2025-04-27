import express, { Request, Response } from 'express';
import QuestionService from '../cli/questionService.js';

const app = express();
app.use(express.json());

const questionService = new QuestionService();

app.post('/ask', async (req: Request, res: Response) => {
  const { question } = req.body;
  try {
    const response = await questionService.run(question);
    res.json({ response });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(3001, () => {
  console.log('MCP Server rodando na porta 3001');
});
