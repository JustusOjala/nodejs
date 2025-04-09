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

let clients: Client[] = [];

export function addClient(client: Client){
  clients.push(client);
  console.log("Added client ", client.id)
}

export function removeClient(id: number){
  clients = clients.filter(c => c.id !== id)
  console.log("Removed client ", id)
}

const db = drizzle(sql);

await sql.listen('logchange', (x) => {
  console.log("Logs changed", x)
  clients.forEach((c) => c.response.write(`data:logchange\n\n`))
});

await sql.listen('userchange', (x) => {
  console.log("Users changed", x)
  clients.forEach((c) => c.response.write(`data:userchange\n\n`))
});

// A clunky way to get clients to reload remotely after changes
await sql.listen('reload', () => {
  console.log("Asking connected clients to reload")
  clients.forEach((c) => c.response.write("data:reload\n\n"))
})

export default db;