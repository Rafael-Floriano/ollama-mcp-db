import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { OllamaMCPHost } from "../core/OllamaMCPHost.js";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL not found in environment or .env file");
  console.error("Please create a .env file with the following format:");
  console.error("DATABASE_URL=postgres://user:password@localhost:5432/dbname");
  process.exit(1);
}

export default class QuestionService {
  async run(question?: string, customDatabaseUrl?: string) {
    const host = new OllamaMCPHost();
    const readline = (await import("readline")).default.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      if (customDatabaseUrl) {
        await host.connectToDatabase(customDatabaseUrl);
      } else {
        await host.connect();
      }
      console.log(
        "\nConnected to database. You can now ask questions about your data."
      );
      console.log('Type "/exit" to quit.\n');

      // If a question was provided (API mode), process it directly
      if (question) {
        const answer = await host.processQuestion(question);
        readline.close();
        await host.cleanup();
        return answer;
      }

      // Otherwise, enter interactive mode
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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const service = new QuestionService();
  service.run().catch(console.error);
}


