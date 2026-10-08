declare module 'cloudflare:workers' {
  export interface R2Object {
    key: string;
    version: string;
    size: number;
    etag: string;
    httpEtag: string;
    uploaded: Date;
    httpMetadata?: Record<string, string>;
    customMetadata?: Record<string, string>;
  }

  export interface R2Objects {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
    delimitedPrefixes: string[];
  }

  export interface R2ListOptions {
    limit?: number;
    prefix?: string;
    cursor?: string;
    delimiter?: string;
    startAfter?: string;
    include?: ('httpMetadata' | 'customMetadata')[];
  }

  export interface R2PutOptions {
    httpMetadata?: Record<string, string>;
    customMetadata?: Record<string, string>;
  }

  export interface R2Bucket {
    list(options?: R2ListOptions): Promise<R2Objects>;
    get(key: string): Promise<R2Object | null>;
    head(key: string): Promise<R2Object | null>;
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions): Promise<R2Object>;
    delete(keys: string | string[]): Promise<void>;
  }

  export const env: {
    MONGODB_URI?: string;
    MONGODB_DB_NAME?: string;
    ADMIN_USER?: string;
    ADMIN_PASS_HASH?: string;
    ADMIN_JWT_SECRET?: string;
    ADMIN_WRITES_ENABLED?: string;
    IMAGES_BUCKET?: R2Bucket;
    ASSETS?: { fetch(request: Request | string): Promise<Response> };
    GA_PROPERTY_ID?: string;
    GA_CLIENT_EMAIL?: string;
    GA_PRIVATE_KEY?: string;
  };
}
