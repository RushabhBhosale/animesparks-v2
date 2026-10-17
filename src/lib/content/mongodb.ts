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

/**
 * Build-time variant: retries transient connection failures (Atlas
 * elections, a briefly unreachable member) with backoff before failing the
 * build. Not used on request paths.
 */
export async function withDatabaseRetry<T>(uri: string | undefined, fn: (db: Db) => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await withDatabase(uri, fn);
    } catch (error) {
      const transient = /timed out|ECONN|EBADQUERY|ENOTFOUND|EAI_AGAIN|querySRV|interrupted|Server selection|socket|network/i.test((error as Error).message || '');
      if (!transient || attempt >= attempts) throw error;
      console.warn(`[build] MongoDB attempt ${attempt} failed (${(error as Error).message}); retrying`);
      await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** (attempt - 1)));
    }
  }
}
