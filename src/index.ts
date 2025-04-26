import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { OllamaMCPHost } from "./core/OllamaMCPHost.js";

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
