import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const sql = postgres(
  process.env.POSTGRES_URL ||
    "postgresql://username:password@springbattlebot-db:5432/database"
);

export interface Client{
  id: number,
  push: (string) => number
}

enum Sport {
  activity = "Activity",
  steps = "Steps",
  biking = "Biking",
  running_walking = "Running/Walking"
}

let clients: Client[] = [];

async function nullStat(sport: Sport): Promise<{sport: Sport; sik_entries: number; kik_entries: number; sik_sum: number; kik_sum: number }>{
  return {sport: Sport.biking, sik_entries: NaN, kik_entries: NaN, sik_sum: NaN, kik_sum: NaN };
}

let statFunction: (sport: Sport) => Promise<{sport: Sport; sik_entries: number; kik_entries: number; sik_sum: number; kik_sum: number }> = nullStat;
let userFunction: () => Promise<number[]> = () => Promise[NaN];

export function setStatFunction(func: (sport: Sport) => Promise<{sport: Sport; sik_entries: number; kik_entries: number; sik_sum: number; kik_sum: number }>){
  statFunction = func;
}

export function setUserFunction(func: () => Promise<number[]>){
  userFunction = func;
}

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
  let jsondata;
  try{
    jsondata = JSON.parse(x);
  }catch{
    jsondata = {sport: NaN};
  }
  
  const sport: Sport = jsondata.sport;
  if(!Number.isNaN(sport)){
    console.log("\tThe sport modified was", sport)
    statFunction(sport)
      .then((result) => clients.forEach((c) => c.push(`logchange::${JSON.stringify(result)}`)))
      .catch(() =>{
        console.log("\t\tCould not get sport info");
        clients.forEach((c) => c.push(`logchange`))    
      })
  }else{
    console.log("\tSport information not in notification")
    clients.forEach((c) => c.push(`data:logchange`))
  }
});

await sql.listen('userchange', (x) => {
  console.log("Users changed", x)
  userFunction()
    .then((count) => {
      console.log("\tnew users", count)
      if(count.length == 2){
        clients.forEach((c) => c.push(`userchange::${count[0]},${count[1]}`))
      }else{
        clients.forEach((c) => c.push(`userchange`))
      }
    })
    .catch(() => clients.forEach((c) => c.push(`userchange`)))
});

// A clunky way to get clients to reload remotely after changes
await sql.listen('reload', () => {
  console.log("Asking connected clients to reload")
  clients.forEach((c) => c.push("reload"))
})

export default db;