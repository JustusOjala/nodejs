import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const sql = postgres(
  process.env.POSTGRES_URL ||
    "postgresql://username:password@springbattlebot-db:5432/database"
);

export interface Client{
  id: number,
  response
}

export let log_clients: Client[] = [];
export let user_clients: Client[] = [];

const db = drizzle(sql);

await sql.listen('logchange', (x) => {
  console.log("Logs changed", x)
  log_clients.forEach((c) => c.response.write(`logchange\n\n`))
});

await sql.listen('userchange', (x) => {
  console.log("Users changed", x)
  user_clients.forEach((c) => c.response.write(`userchange\n\n`))
});

export default db;