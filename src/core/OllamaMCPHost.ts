import ollama from "ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { databaseUrl } from "../utils/env.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { DatabaseService } from "./DatabaseService.js";

// Set the Ollama host from environment variable
const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
if (ollamaHost !== "http://localhost:11434") {
  // @ts-ignore - The ollama package doesn't have proper types for this
  ollama.host = ollamaHost;
}

export class OllamaMCPHost {
  private client: Client;
  private transport: StdioClientTransport;
  private modelName: string;
  private chatHistory: { role: string; content: string }[] = [];
  private readonly MAX_HISTORY_LENGTH = 20;
  private readonly MAX_RETRIES = 5;
  private databaseService: DatabaseService;

  constructor(modelName?: string) {
    this.modelName =
      modelName || process.env.OLLAMA_MODEL || "llama3.2:latest";
    this.databaseService = new DatabaseService();
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
    await this.databaseService.connect();
  }

  async connectToDatabase(databaseUrl: string) {
    await this.databaseService.connectToDatabase(databaseUrl);
  }

  private async executeQuery(sql: string): Promise<string> {
    return await this.databaseService.execute(sql);
  }

  private addToHistory(role: string, content: string) {
    this.chatHistory.push({ role, content });
    if (this.chatHistory.length > this.MAX_HISTORY_LENGTH) {
      this.chatHistory.shift();
    }
  }

  async processQuestion(question: string): Promise<string> {
    try {
      let attemptCount = 0;

      const promptBuilder = new PromptBuilder();

      while (attemptCount <= this.MAX_RETRIES) {
        const messages = await promptBuilder.build(question);

        console.log(
          attemptCount > 0 ? `\nRetry attempt ${attemptCount}...` : ""
        );

        // Get response from Ollama
        const response = await ollama.chat({
          model: this.modelName,
          messages: messages
        });

        console.log("\n COMPLETED PROMPT: ", messages);
        console.log("\n LLM response: ", response);

        this.addToHistory("assistant", response.message.content);

        // Extract SQL query
        const sqlMatch = response.message.content.match(
          /```sql\n([\s\S]*?)\n```/
        );
        if (!sqlMatch) {
          return response.message.content;
        }

        const sql = sqlMatch[1].trim();

        console.log("\n SQL QUERY: ", sql);

        try {
          // Execute the query
          const queryResult = await this.executeQuery(sql);
          this.addToHistory(
            "user",
            `Here are the results of the SQL query: ${queryResult}`
          );

          console.log(queryResult);
          attemptCount = this.MAX_RETRIES;
          return queryResult;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.addToHistory("user", errorMessage);
          if (attemptCount === this.MAX_RETRIES) {
            return `I apologize, but I was unable to successfully query the database after ${
              this.MAX_RETRIES + 1
            } attempts. The last error was: ${errorMessage}`;
          }
        }

        attemptCount++;
      }

      return "An unexpected error occurred while processing your question.";
    } catch (error) {
      console.error("Error processing question:", error);
      return `An error occurred: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  async cleanup() {
    await this.databaseService.cleanup();
  }
}
