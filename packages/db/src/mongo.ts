import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(uri: string): Promise<Db> {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

export function getMongo(): Db {
  if (!db) throw new Error('MongoDB not connected');
  return db;
}

export async function pingMongo(): Promise<boolean> {
  if (!db) return false;
  await db.command({ ping: 1 });
  return true;
}

export async function disconnectMongo(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
