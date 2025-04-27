import express, { Request, Response, RequestHandler } from 'express';
import QuestionService from '../cli/questionService.js';

const app = express();
app.use(express.json());

const questionService = new QuestionService();

interface AskRequest {
  question: string;
  databaseUrl?: string;
}

const askHandler: RequestHandler = async (req, res, next) => {
  try {
    const { question, databaseUrl } = req.body as AskRequest;
    
    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const response = await questionService.run(question, databaseUrl);
    res.json({ response });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
};

app.post('/ask', askHandler);

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
