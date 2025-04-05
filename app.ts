import express from 'express';
import path from 'path';
import db from "./db/db.ts";
import { log_events, logs, users } from "./db/schema.ts";
import { and, sql, eq, between, desc } from "drizzle-orm";
import cors from 'cors';

const app = express();
const PORT = 3000;

var corsOptions = {
  origin: 'https://springbattlestatus-production.up.railway.app',
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

type Guild = "SIK" | "KIK";

enum Sport {
  activity = "Activity",
  biking = "Biking",
  running_walking = "Running/Walking",
}

async function getParticipants() {
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './views/index.html'));
});

app.get('/sports', (req, res) => {
  getStats().then((stats) => res.send(stats));
});

app.get('/participants', (req, res) => {
  getParticipants().then((stats) => res.send(stats));
});

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
  });

app.listen(PORT, '::', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
