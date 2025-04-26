export class PromptBuilder {
  
    private readonly SYSTEM_PROMPT = `
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
    
    private readonly USER_CONTEXT = `
    I have a database with the following tables:
    
    [
      {"table_name": "cliente", , "columns" ["id", "nome", "email"]},
      {"table_name": "endereco", "columns" ["id", "cliente_id", "rua", "cidade", "estado", "cep"]},
      {"table_name": "produto", "columns" ["id", "nome", "preco"]},
      {"table_name": "venda", , "columns" ["id", "cliente_id", "produto_id", "quantidade", "total"]}
    ]
    
    I have a question:
    
    `;


    build(question: string) {
      return [
        { role: "system", content: this.SYSTEM_PROMPT },
        { role: "user", content: this.USER_CONTEXT + question }
      ];
    }
  }
  