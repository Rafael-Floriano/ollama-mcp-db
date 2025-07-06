export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: string;
  message: string;
  data?: any;
  duration?: number;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Console output com emojis para fácil identificação
    const emoji = {
      'INFO': '📝',
      'WARN': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍'
    }[entry.level];

    const duration = entry.duration ? ` (${entry.duration}ms)` : '';
    console.log(`${emoji} [${entry.timestamp}] ${entry.component}: ${entry.message}${duration}`);
    
    if (entry.data) {
      console.log(`   📊 Data:`, JSON.stringify(entry.data, null, 2));
    }
  }

  info(component: string, message: string, data?: any, duration?: number) {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      component,
      message,
      data,
      duration
    });
  }

  warn(component: string, message: string, data?: any, duration?: number) {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      component,
      message,
      data,
      duration
    });
  }

  error(component: string, message: string, data?: any, duration?: number) {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component,
      message,
      data,
      duration
    });
  }

  debug(component: string, message: string, data?: any, duration?: number) {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      component,
      message,
      data,
      duration
    });
  }

  // Log específico para queries SQL
  logQuery(question: string, sql: string, result: string, duration: number) {
    this.info('SQL_QUERY', 'Query executed successfully', {
      question,
      sql,
      resultLength: result.length,
      resultPreview: result.substring(0, 200) + (result.length > 200 ? '...' : '')
    }, duration);
  }

  // Log específico para respostas do LLM
  logLLMResponse(model: string, prompt: any, response: string, duration: number) {
    this.info('LLM_RESPONSE', 'LLM response received', {
      model,
      promptTokens: JSON.stringify(prompt).length,
      responseLength: response.length,
      responsePreview: response.substring(0, 200) + (response.length > 200 ? '...' : '')
    }, duration);
  }

  // Log específico para erros de query
  logQueryError(question: string, sql: string, error: string, attempt: number) {
    this.error('SQL_ERROR', `Query failed on attempt ${attempt}`, {
      question,
      sql,
      error
    });
  }

  // Log específico para performance geral
  logPerformance(operation: string, duration: number, metadata?: any) {
    this.info('PERFORMANCE', `${operation} completed`, metadata, duration);
  }

  // Obter todos os logs
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Obter logs por componente
  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  // Limpar logs
  clearLogs() {
    this.logs = [];
  }

  // Exportar logs para JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
} 