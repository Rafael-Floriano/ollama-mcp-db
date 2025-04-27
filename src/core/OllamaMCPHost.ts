import ollama from "ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { databaseUrl } from "../utils/env.js";
import { PromptBuilder } from "./PromptBuilder.js";

export class OllamaMCPHost {
  private client: Client;
  private transport: StdioClientTransport;
  private modelName: string;
  private chatHistory: { role: string; content: string }[] = [];
  private readonly MAX_HISTORY_LENGTH = 20;
  private readonly MAX_RETRIES = 5;

  constructor(modelName?: string) {
    this.modelName =
      modelName || process.env.OLLAMA_MODEL || "qwen2.5-coder:7b-instruct";
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
    await this.client.connect(this.transport);
  }

  private async executeQuery(sql: string): Promise<string> {
    const response = await this.client.request(
      {
        method: "tools/call",
        params: {
          name: "query",
          arguments: { sql },
        },
      },
      CallToolResultSchema
    );

    if (!response.content?.[0]?.text) {
      throw new Error("No text content received from query");
    }
    return response.content[0].text as string;
  }

  private addToHistory(role: string, content: string) {
    this.chatHistory.push({ role, content });
    while (this.chatHistory.length > this.MAX_HISTORY_LENGTH) {
      this.chatHistory.shift();
    }
  }

  async processQuestion(question: string): Promise<string> {
    try {
      let attemptCount = 0;

      const promptBuilder = new PromptBuilder();

      while (attemptCount <= this.MAX_RETRIES) {
        // ...this.chatHistory
        const messages = promptBuilder.build(question);

        console.log(
          attemptCount > 0 ? `\nRetry attempt ${attemptCount}...` : ""
        );

        // Get response from Ollama
        const response = await ollama.chat({
          model: this.modelName,
          messages: messages,
        });
        this.addToHistory("assistant", response.message.content);

        // Extract SQL query
        const sqlMatch = response.message.content.match(
          /```sql\n([\s\S]*?)\n```/
        );
        if (!sqlMatch) {
          return response.message.content;
        }

        const sql = sqlMatch[1].trim();

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
    await this.transport.close();
  }
}
