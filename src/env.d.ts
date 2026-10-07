declare module 'cloudflare:workers' {
  export const env: { MONGODB_URI?: string; MONGODB_DB_NAME?: string };
}
