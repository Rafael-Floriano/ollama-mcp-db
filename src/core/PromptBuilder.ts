import { DatabaseScanner } from "./DatabaseScanner.js";

const databaseScanner = new DatabaseScanner();

export class PromptBuilder {
  
  private readonly SYSTEM_PROMPT = `You are a SQL generator. Use ONLY the tables and columns from the provided schema. Respond ONLY with SQL queries wrapped in \`\`\`sql...\`\`\`. No explanations, no text, just SQL.

SCHEMA: {SCHEMA_JSON}`;  
    
    private readonly USER_QUESTION = `Generate SQL for: {QUESTION}`;

    async build(question: string) {
      const dbStructure = await databaseScanner.getDatabaseStructure();
      const formattedStructure = JSON.stringify(dbStructure, null, 2);
      
      const systemPrompt = this.SYSTEM_PROMPT.replace('{SCHEMA_JSON}', formattedStructure);
      const userPrompt = this.USER_QUESTION.replace('{QUESTION}', question);
      
      return [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];
    }
  }
  