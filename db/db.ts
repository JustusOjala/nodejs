import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const sql = postgres(
  process.env.POSTGRES_URL ||
    "postgresql://username:password@springbattlebot-db:5432/database"
);

const db = drizzle(sql);

console.log("Creating listeners");

await sql.listen('logchange', (x) => {console.log("Logs changed", x)});

await sql.listen('userchange', (x) => console.log("Users changed", x));

export default db;