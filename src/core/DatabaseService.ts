import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { databaseUrl } from "../utils/env.js";


export class DatabaseService {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
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
    await this.transport.close();
  }
}
