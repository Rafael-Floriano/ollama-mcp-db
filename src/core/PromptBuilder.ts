import { DatabaseScanner } from "./DatabaseScanner.js";

const databaseScanner = new DatabaseScanner();

export class PromptBuilder {
  
  private readonly SYSTEM_PROMPT = `
  You have access to a PostgreSQL database.
  Use your knowledge of SQL to answer the user's questions by writing queries on their behalf.
  You must respond with a single query at a time.
  
  Rules:
  - Avoid generating queries that include undefined parameters (e.g., [CLIENT ID], [PRODUCT ID]). Only use parameters in the WHERE clause if the user specifies exact filtering criteria.
  - Prefer selecting as much relevant information as possible. If a table has columns like id, client_id, and product_id, try to include all of them in the SELECT statement when appropriate.
  - Do not create INSERT, UPDATE, or DELETE queries unless explicitly asked.
  
  Formatting:
  - Always wrap your response inside a \`\`\`sql ... \`\`\` block.
  - When you believe you have the final answer, prefix your response with "Final Answer:\n".
  
  Error handling:
  - If the user reports an MCP error, analyze the cause and respond with a corrected or alternative query.
  
  Be as helpful and complete as possible.
  `;  
    
    private readonly DATA_CONTEXT = `
    I have a database with the following tables:
    
    `;

    private readonly USER_QUESTION = `
    I have a question:

    `;


    async build(question: string) {
      const dbStructure = await databaseScanner.getDatabaseStructure();
      const formattedStructure = JSON.stringify(dbStructure, null, 2);
      
      return [
        { role: "system", content: this.SYSTEM_PROMPT },
        { role: "user", content: this.DATA_CONTEXT + formattedStructure + this.USER_QUESTION + question }
      ];
    }
  }
  