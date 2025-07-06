import express, { Request, Response, RequestHandler } from 'express';
import QuestionService from '../cli/questionService.js';
import { Logger } from '../utils/Logger.js';

const app = express();
app.use(express.json());

const questionService = new QuestionService();
const logger = Logger.getInstance();

interface AskRequest {
  question: string;
  databaseUrl?: string;
}

const askHandler: RequestHandler = async (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { question, databaseUrl } = req.body as AskRequest;
    
    logger.info('API_REQUEST', 'New request received', {
      requestId,
      question,
      hasDatabaseUrl: !!databaseUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    if (!question) {
      logger.warn('API_VALIDATION', 'Missing question parameter', { requestId });
      res.status(400).json({ 
        error: 'Question is required',
        requestId 
      });
      return;
    }

    const response = await questionService.run(question, databaseUrl);
    const duration = Date.now() - startTime;
    
    logger.logPerformance('API_RESPONSE', duration, {
      requestId,
      question,
      responseLength: response.length
    });
    
    res.json({ 
      response,
      requestId,
      duration: `${duration}ms`
    });
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    logger.error('API_ERROR', 'Request failed', {
      requestId,
      question: req.body?.question,
      error: errorMessage,
      duration
    });
    
    res.status(500).json({ 
      error: errorMessage,
      requestId,
      duration: `${duration}ms`
    });
  }
};

// Endpoint principal para perguntas
app.post('/ask', askHandler);

// Endpoint para obter logs
app.get('/logs', (req: Request, res: Response) => {
  try {
    const { component, limit } = req.query;
    let logs = logger.getLogs();
    
    if (component) {
      logs = logger.getLogsByComponent(component as string);
    }
    
    if (limit) {
      logs = logs.slice(-parseInt(limit as string));
    }
    
    res.json({
      logs,
      total: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint para exportar logs
app.get('/logs/export', (req: Request, res: Response) => {
  try {
    const logsJson = logger.exportLogs();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.json');
    res.send(logsJson);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to export logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint para limpar logs
app.delete('/logs', (req: Request, res: Response) => {
  try {
    logger.clearLogs();
    res.json({ 
      message: 'Logs cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint de health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Middleware para log de todas as requisições
app.use((req: Request, res: Response, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP_REQUEST', `${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, duration);
  });
  
  next();
});

app.listen(3001, () => {
  logger.info('SERVER', 'MCP Server started successfully', {
    port: 3001,
    environment: process.env.NODE_ENV || 'development'
  });
  console.log('🚀 MCP Server rodando na porta 3001');
  console.log('📊 Endpoints disponíveis:');
  console.log('   POST /ask - Fazer perguntas');
  console.log('   GET  /logs - Ver logs');
  console.log('   GET  /logs/export - Exportar logs');
  console.log('   DELETE /logs - Limpar logs');
  console.log('   GET  /health - Health check');
});
