import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { databaseUrl } from "../utils/env.js";
import { TableStructure } from "../types/index.js";
export class DatabaseService {
  private client: Client;
  private transport!: StdioClientTransport;
  private currentDatabaseUrl: string;

  constructor() {
    this.currentDatabaseUrl = databaseUrl!;
    this.initializeTransport();
    this.client = new Client(
      { name: "ollama-mcp-host", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  private initializeTransport() {
    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", this.currentDatabaseUrl],
    });
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async connectToDatabase(databaseUrl: string) {
    // Fechando conexão se existente
    await this.cleanup();
    
    // Muda a url para a base de dados especificada, e não para a do env
    this.currentDatabaseUrl = databaseUrl;
    
    this.initializeTransport();
    await this.connect();
  }



  async execute(sql: string): Promise<string> {
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

    return response.content?.[0]?.text || "No result";
  }

  async cleanup() {
    if (this.transport) {
      await this.transport.close();
    }
  }
}
