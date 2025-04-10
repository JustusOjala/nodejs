import express from 'express';
import path from 'path';
import db, {Client, addClient, removeClient, setStatFunction, setUserFunction} from "./db/db.ts";
import pg_sql from "./db/db.ts";
import { log_events, logs, users } from "./db/schema.ts";
import { and, sql, eq, between, desc } from "drizzle-orm";

const app = express();
const PORT = process.env.PORT;

type Guild = "SIK" | "KIK";

enum Sport {
  activity = "Activity",
  biking = "Biking",
  running_walking = "Running/Walking"
}

async function getUsers() {
  const user_count = await db
    .select({
      guild: users.guild,
      count: sql`count(${users.id})`.mapWith(Number)
    })
    .from(users)
    .groupBy(users.guild);

  const sik_users = user_count.find((g) => g.guild === "SIK") || {guild: "SIK", count: 0};
  const kik_users = user_count.find((g) => g.guild === "KIK") || {guild: "KIK", count: 0};

  return [sik_users.count, kik_users.count];
}

async function getStats() {
  const stats = await db
    .select({
      guild: logs.guild,
      sport: logs.sport,
      sum: sql`sum(${logs.distance})`.mapWith(Number),
      entries: sql`count(${logs.distance})`.mapWith(Number)
    })
    .from(logs)
    .groupBy(logs.guild, logs.sport);

  return Object.values(Sport).flatMap((sport) => {
    const kik = stats.find((s) => s.sport === sport && s.guild === "KIK") || {
      guild: "KIK",
      sport,
      sum: 0,
      entries: 0,
    };

    const sik = stats.find((s) => s.sport === sport && s.guild === "SIK") || {
      guild: "SIK",
      sport,
      sum: 0,
      entries: 0,
    };

    return { sport, sik_sum: sik.sum, kik_sum: kik.sum, sik_entries: sik.entries, kik_entries: kik.entries };
  });
}

async function getStat(sport: Sport){
  const stats = await getStats()
  
  return stats.find((s) => s.sport === sport) || {sport: sport, sik_sum: NaN, kik_sum: NaN, sik_entries: NaN, kik_entries: NaN}
}

setStatFunction(getStat);
setUserFunction(getUsers);

app.get('/', (req, res) => {
  res.send("You seem to be lost.");
});

app.get('/sports', (req, res) => {
  getStats().then((stats) => res.send(stats));
});

app.get('/participants', (req, res) => {
  getUsers().then((stats) => res.send(stats));
});

app.get('/notifications', (req, res) => {
  const headers = {
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
  }
  res.writeHead(200, headers);

  const clientId = Date.now()

  const newClient: Client = {
    id: clientId,
    response: res
  }

  addClient(newClient);

  req.on('close', () => {
    console.log("Client ", clientId, "dropped");
    removeClient(clientId);
    res.end();
  });
});

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).send("Path not found");
  });

app.listen(PORT, '::', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});