import { TableStructure } from "../types/index.js";
import { DatabaseService } from "./DatabaseService.js";

const databaseService = new DatabaseService();

export class DatabaseScanner {

  async scan(databaseUrl: string) {
    if (!databaseUrl) {
        throw new Error("Database URL is required");
    }
    await databaseService.connectToDatabase(databaseUrl);
  }

  async getDatabaseStructure(): Promise<TableStructure[]> {

    // Connect to the default database specified in the env
    await databaseService.connect();

    const query = `
      SELECT 
        t.table_name,
        array_agg(c.column_name) as columns
      FROM 
        information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE 
        t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      GROUP BY 
        t.table_name
      ORDER BY 
        t.table_name;
    `;

    const result = await databaseService.execute(query);
    
    try {
      // Parse the result string into a JSON object
      const parsedResult = JSON.parse(result);
      
      // Transform the result into the required format
      return parsedResult.map((row: any) => ({
        table_name: row.table_name,
        columns: row.columns
      }));
    } catch (error) {
      console.error('Error parsing database structure:', error);
      throw new Error('Failed to parse database structure');
    }
  }
}
