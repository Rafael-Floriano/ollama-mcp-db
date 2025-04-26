import dotenv from "dotenv";
dotenv.config();

export const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}
