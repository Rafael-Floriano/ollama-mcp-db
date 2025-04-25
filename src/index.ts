import ollama from "ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Load environment variables from .env file
dotenv.config();

// Check for required environment variables
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL not found in environment or .env file");
  console.error("Please create a .env file with the following format:");
  console.error("DATABASE_URL=postgres://user:password@localhost:5432/dbname");
  process.exit(1);
}

const SYSTEM_PROMPT = `
You have access to a PostgreSQL database.
Use your knowledge of SQL to answer the user's question by writing queries on their behalf.
You may only respond with a single query at a time.
You will always try to respond with as much information as possible

Your response must be in this format:

\`\`\`sql
Your query goes here.
\`\`\`

If the user tells you that there was an MCP error, analyze the error and respond with a different query.

When you think you have the final answer to the user's question, prefix your response with "Final Answer:\n"
`;

const USER_PROMPT = `
I have a database with the following tables:

[
  {"table_name": "cliente", , "columns" ["id", "nome", "email"]},
  {"table_name": "endereco", "columns" ["id", "cliente_id", "rua", "cidade", "estado", "cep"]},
  {"table_name": "produto", "columns" ["id", "nome", "preco"]},
  {"table_name": "venda", , "columns" ["id", "cliente_id", "produto_id", "quantidade", "total"]}
]

I have a question:

`;

class OllamaMCPHost {
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

      while (attemptCount <= this.MAX_RETRIES) {
        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `${USER_PROMPT}${question}`,
          },
          ...this.chatHistory,
        ];

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

async function main() {
  const host = new OllamaMCPHost();
  const readline = (await import("readline")).default.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await host.connect();
    console.log(
      "\nConnected to database. You can now ask questions about your data."
    );
    console.log('Type "/exit" to quit.\n');

    const askQuestion = (prompt: string) =>
      new Promise<string>((resolve) => {
        readline.question(prompt, resolve);
      });

    while (true) {
      const userInput = await askQuestion(
        "\nWhat would you like to know about your data? "
      );

      if (userInput.toLowerCase().includes("/exit")) {
        console.log("\nGoodbye!\n");
        readline.close();
        await host.cleanup();
        process.exit(0);
      }

      console.log("\nAnalyzing...\n");
      const answer = await host.processQuestion(userInput);
      console.log("\n", answer, "\n");
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    readline.close();
    await host.cleanup();
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default OllamaMCPHost;
