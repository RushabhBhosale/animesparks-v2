import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';

// Workers cannot create TCP sockets in global scope. Each request owns its
// MongoClient, and finally closes it; no cross-request pool or cache is kept.
export async function withDatabase<T>(uri: string | undefined, fn: (db: Db) => Promise<T>): Promise<T> {
  if (!uri) throw new Error('MongoDB secret is not configured');
  const client = new MongoClient(uri, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 8000,
  } as MongoClientOptions);
  try {
    await client.connect();
    return await fn(client.db('animesparks'));
  } finally {
    await client.close();
  }
}
