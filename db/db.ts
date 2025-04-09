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

let log_clients: Client[] = [];
let user_clients: Client[] = [];
let reload_clients: Client[] = [];

export function addLogClient(client: Client){
  log_clients.push(client);
  console.log("Added log client ", client.id)
}

export function removeLogClient(id: number){
  log_clients = log_clients.filter(c => c.id !== id)
  console.log("Removed log client ", id)
}

export function addUserClient(client: Client){
  user_clients.push(client);
  console.log("Added user client ", client.id)
}

export function removeUserClient(id: number){
  user_clients = log_clients.filter(c => c.id !== id)
  console.log("Removed user client ", id)
}

export function addReloadClient(client: Client){
  reload_clients.push(client);
  console.log("Added reload client ", client.id)
}

export function removeReloadClient(id: number){
  reload_clients = log_clients.filter(c => c.id !== id)
  console.log("Removed reload client ", id)
}

const db = drizzle(sql);

await sql.listen('logchange', (x) => {
  console.log("Logs changed", x)
  log_clients.forEach((c) => c.response.write(`data:logchange\n\n`))
});

await sql.listen('userchange', (x) => {
  console.log("Users changed", x)
  user_clients.forEach((c) => c.response.write(`data:userchange\n\n`))
});

// A clunky way to get clients to reload remotely after changes
await sql.listen('reload', () => {
  console.log("Asking connected clients to reload")
  reload_clients.forEach((c) => c.response.write("data:reload\n\n"))
})

export default db;