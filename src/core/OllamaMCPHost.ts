import ollama from "ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { databaseUrl } from "../utils/env.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { DatabaseService } from "./DatabaseService.js";
import { getConfig } from "./Config.js";
import { Logger } from "../utils/Logger.js";

// Set the Ollama host from configuration
const config = getConfig();
if (config.host !== "http://localhost:11434") {
  // @ts-ignore - The ollama package doesn't have proper types for this
  ollama.host = config.host;
}

export class OllamaMCPHost {
  private client: Client;
  private transport: StdioClientTransport;
  private modelName: string;
  private databaseService: DatabaseService;
  private logger: Logger;
  
  // Configuração otimizada para performance
  private readonly config = getConfig();

  constructor(modelName?: string) {
    this.modelName = modelName || config.model;
    this.databaseService = new DatabaseService();
    this.logger = Logger.getInstance();
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", databaseUrl!],
    });
    this.client = new Client(
      { name: "ollama-mcp-host", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect() {
    const startTime = Date.now();
    await this.databaseService.connect();
    this.logger.logPerformance('Database connection', Date.now() - startTime);
  }

  async connectToDatabase(databaseUrl: string) {
    const startTime = Date.now();
    await this.databaseService.connectToDatabase(databaseUrl);
    this.logger.logPerformance('Database connection', Date.now() - startTime);
  }

  private async executeQuery(sql: string): Promise<string> {
    const startTime = Date.now();
    const result = await this.databaseService.execute(sql);
    const duration = Date.now() - startTime;
    this.logger.logPerformance('SQL execution', duration, { sql });
    return result;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateLLMResponse(response: string): { isValid: boolean; sql?: string; error?: string } {
    // Verificar se a resposta está vazia
    if (!response || response.trim().length === 0) {
      return { isValid: false, error: "Empty response from LLM" };
    }

    // Verificar se contém SQL
    const sqlMatch = response.match(/```sql\n([\s\S]*?)\n```/);
    if (!sqlMatch) {
      return { isValid: false, error: "No SQL query found in response" };
    }

    const sql = sqlMatch[1].trim();
    
    // Verificar se o SQL não está vazio
    if (!sql || sql.length === 0) {
      return { isValid: false, error: "Empty SQL query extracted" };
    }

    // Verificar se é um SELECT válido (básico)
    if (!sql.toLowerCase().includes('select')) {
      return { isValid: false, error: "Query is not a SELECT statement" };
    }

    return { isValid: true, sql };
  }

  async processQuestion(question: string): Promise<string> {
    const totalStartTime = Date.now();
    this.logger.info('ENDPOINT', 'Processing new question', { question });

    try {
      let attemptCount = 0;
      const promptBuilder = new PromptBuilder();

      while (attemptCount <= this.config.retry.max_attempts) {
        const attemptStartTime = Date.now();
        
        if (attemptCount > 0) {
          this.logger.warn('RETRY', `Retry attempt ${attemptCount}`, { 
            question, 
            previousAttempts: attemptCount 
          });
          await this.delay(this.config.retry.delays[attemptCount - 1]);
        }

        // Build prompt
        const promptStartTime = Date.now();
        const messages = await promptBuilder.build(question);
        this.logger.logPerformance('Prompt building', Date.now() - promptStartTime, {
          question,
          promptTokens: JSON.stringify(messages).length
        });

        // Get response from Ollama with optimized parameters
        const llmStartTime = Date.now();
        let response;
        try {
          response = await ollama.chat({
            model: this.modelName,
            messages: messages,
            options: this.config.inference
          });
        } catch (ollamaError) {
          this.logger.error('OLLAMA_ERROR', 'Failed to get response from Ollama', {
            error: ollamaError instanceof Error ? ollamaError.message : String(ollamaError),
            attempt: attemptCount + 1
          });
          
          if (attemptCount === this.config.retry.max_attempts) {
            throw new Error(`Ollama connection failed after ${this.config.retry.max_attempts + 1} attempts`);
          }
          attemptCount++;
          continue;
        }
        
        const llmDuration = Date.now() - llmStartTime;

        this.logger.logLLMResponse(this.modelName, messages, response.message.content, llmDuration);

        // Validar resposta do LLM
        const validation = this.validateLLMResponse(response.message.content);
        if (!validation.isValid) {
          this.logger.warn('LLM_VALIDATION', `Invalid LLM response on attempt ${attemptCount + 1}`, {
            error: validation.error,
            response: response.message.content.substring(0, 200)
          });
          
          if (attemptCount === this.config.retry.max_attempts) {
            return `❌ Failed to generate valid SQL query after ${this.config.retry.max_attempts + 1} attempts. Last error: ${validation.error}`;
          }
          attemptCount++;
          continue;
        }

        const sql = validation.sql!;
        this.logger.debug('SQL_EXTRACTION', 'SQL query extracted and validated', { sql });

        try {
          // Execute the query
          const queryResult = await this.executeQuery(sql);
          const totalDuration = Date.now() - totalStartTime;
          
          this.logger.logQuery(question, sql, queryResult, totalDuration);
          this.logger.logPerformance('Total processing', totalDuration, {
            question,
            sql,
            resultLength: queryResult.length,
            attempts: attemptCount + 1
          });
          
          return queryResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.logQueryError(question, sql, errorMessage, attemptCount + 1);
          
          if (attemptCount === this.config.retry.max_attempts) {
            const totalDuration = Date.now() - totalStartTime;
            this.logger.error('ENDPOINT', 'Max retries exceeded', {
              question,
              totalAttempts: this.config.retry.max_attempts + 1,
              lastError: errorMessage,
              totalDuration
            });
            return `❌ Unable to execute query after ${this.config.retry.max_attempts + 1} attempts. Last error: ${errorMessage}`;
          }
        }

        attemptCount++;
      }

      const totalDuration = Date.now() - totalStartTime;
      this.logger.error('ENDPOINT', 'Unexpected error in processing loop', {
        question,
        totalDuration
      });
      return "❌ An unexpected error occurred while processing your question.";
    } catch (error) {
      const totalDuration = Date.now() - totalStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('ENDPOINT', 'Critical error in processQuestion', {
        question,
        error: errorMessage,
        totalDuration
      });
      
      return `💥 An error occurred: ${errorMessage}`;
    }
  }

  async cleanup() {
    const startTime = Date.now();
    await this.databaseService.cleanup();
    this.logger.logPerformance('Cleanup', Date.now() - startTime);
  }

  // Método para obter logs
  getLogs() {
    return this.logger.getLogs();
  }

  // Método para exportar logs
  exportLogs() {
    return this.logger.exportLogs();
  }
}
