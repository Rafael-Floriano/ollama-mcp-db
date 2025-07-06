import { DatabaseScanner } from "./DatabaseScanner.js";

const databaseScanner = new DatabaseScanner();

export class PromptBuilder {
  
  private readonly SYSTEM_PROMPT = `You are a SQL generator. For every user question, generate a single, complete, and efficient SQL SELECT query using ONLY the tables and columns from the provided schema.

RULES:
- Always include all relevant columns (e.g., id, name/nome, price/preco, date/data, value/valor, etc.) in the SELECT.
- If the question is about "most", "top", "maior", "menor", "mais caro", "mais recente", etc., always ORDER BY the relevant column and use LIMIT 10.
- Never return only a single column if more context is available.
- Use exact table and column names from the schema.
- Respond ONLY with the SQL query wrapped in \`\`\`sql ... \`\`\`.
- No explanations, no text, just SQL.

SCHEMA: {SCHEMA_JSON}
`;
    
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
  