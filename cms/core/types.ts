import type { Db, MongoClient } from 'mongodb';
import type { ArticleDocument, PortableBlock, CategoryDocument, AuthorDocument, ContentImage } from '../../src/lib/content/types';

export type { PortableBlock, CategoryDocument, AuthorDocument, ContentImage };
/** Article documents keep the shape the Astro site already reads. `sanityId` is the stable article ID. */
export type Article = ArticleDocument & { createdAt?: string; officialTrailerUrl?: string; [key: string]: unknown };

export const STATUSES = ['draft', 'needs_repair', 'awaiting_media', 'awaiting_review', 'ready', 'scheduled', 'publishing', 'published', 'failed'] as const;
export type Status = typeof STATUSES[number];
export type Scope = 'read' | 'write' | 'media' | 'publish' | 'admin';
export type ApprovalMode = 'manual' | 'auto' | 'scheduled';

export interface Issue {
  code: string;
  group: 'metadata' | 'media' | 'content' | 'schedule';
  severity: 'error' | 'warning';
  field?: string;
  message: string;
  repairable: boolean;
}

export interface CustomField { key: string; label: string; type: 'string' | 'text' | 'number' | 'boolean' | 'select' | 'tags'; options?: string[]; required?: boolean; default?: unknown }

export interface Project {
  _id: string;
  name: string;
  siteUrl: string;
  timezone: string;
  /** Where this project's content lives. Existing sites map onto their existing collections. */
  content: { dbName: string; articles: string; categories: string; authors: string; assets: string };
  /** Public URL pattern, `{slug}` and optional per-language overrides. */
  urls: { article: string; byLanguage?: Record<string, string> };
  customFields: CustomField[];
  defaults: { authorId?: string; categoryId?: string; language?: string };
  categoryRules: Array<{ categoryId: string; keywords: string[]; articleTypes?: string[] }>;
  publishing: {
    approvalMode: ApprovalMode;
    slots: string[];
    minLeadMinutes: number;
    verifyLive: boolean;
    deployHook?: { type: 'github_dispatch'; repository: string; eventType: string } | { type: 'webhook'; url: string };
  };
  quality: {
    minWords: number; requireHeadings: boolean; requireExcerpt: boolean;
    metaTitleMax: number; metaDescriptionMin: number; metaDescriptionMax: number;
    requireHero: boolean; minInlineImages: number; wordsPerInlineImage: number; maxInlineImages: number;
    checkInternalLinks: boolean; allowedBlockTypes: string[];
  };
  repair: { enabled: boolean; author: boolean; category: boolean; seo: boolean; slug: boolean; internalLinks: boolean; maxInternalLinks: number; useAi: boolean };
  media: {
    enabled: boolean; bucket?: string; publicBaseUrl: string; keyPrefix: string;
    providers: Array<'library' | 'translation' | 'anilist' | 'fandom' | 'ai'>;
    fandomWikis: Record<string, string>;
    heroMaxWidth: number; inlineMaxWidth: number; heroMinWidth: number; inlineMinWidth: number; quality: number;
    aiGeneration: { enabled: boolean; stylePrompt: string };
  };
  automation: { enabled: boolean; enabledAt?: string; maxAttempts: number };
  createdAt: string;
  updatedAt: string;
}

export interface ArticleMeta {
  _id: string; // `${projectId}:${articleId}`
  projectId: string;
  articleId: string;
  status: Status;
  version: number;
  intent?: { type: 'publish' | 'schedule'; at?: string; by: string; requestedAt: string };
  scheduledAt?: string;
  firstPublishedAt?: string;
  contentHash?: string;
  processedHash?: string;
  issues: Issue[];
  repaired: Array<{ field: string; at: string; by: string; note?: string }>;
  seo?: { canonicalUrl?: string; ogTitle?: string; ogDescription?: string; ogImage?: string };
  relatedIds?: string[];
  mediaReview?: { reason: string; at: string };
  live?: { url: string; verifiedAt?: string; lastStatus?: number; checkedAt?: string };
  lock?: { owner: string; until: string };
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  sanityId: string; sha1: string; r2Key: string; publicUrl: string;
  filename: string; originalFilename?: string; mimeType: string; byteSize: number; width: number; height: number; aspectRatio: number;
  alt?: string; title?: string; franchise?: string; subjects?: string[];
  source?: { provider: string; url?: string; page?: string; license: string; attribution?: string };
  approved?: boolean; rightsConfirmed?: boolean; referenced?: boolean; usedBy?: string[];
  projectId?: string; r2VerifiedAt?: string; broken?: boolean; createdAt: string; updatedAt: string;
}

export type JobType = 'process_article' | 'process_images' | 'publish_article' | 'verify_live' | 'verify_media';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'dead';
export interface Job {
  _id: string; projectId: string; articleId?: string; type: JobType; status: JobStatus;
  idempotencyKey: string; attempts: number; maxAttempts: number; runAt: string;
  lockedBy?: string; lockedUntil?: string; payload?: Record<string, unknown>; result?: unknown; error?: string;
  requires?: string[]; createdAt: string; updatedAt: string; finishedAt?: string;
}

export interface Storage {
  kind: string;
  /** When set, overrides the project's public media domain (local development storage). */
  publicBase?: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
}
export interface OptimizedImage { bytes: Uint8Array; width: number; height: number; mimeType: string; ext: string }
export type Optimizer = (bytes: Uint8Array, opts: { maxWidth: number; quality: number }) => Promise<OptimizedImage>;

export interface AiProvider {
  text?(prompt: string, maxTokens?: number): Promise<string>;
  image?(prompt: string, size: { width: number; height: number }): Promise<Uint8Array>;
}

export interface Actor { type: 'user' | 'token' | 'engine'; id: string; scopes: Set<Scope>; projectIds: string[] | '*' }

export interface Ctx {
  client: MongoClient;
  db: Db;
  env: Record<string, string | undefined>;
  actor: Actor;
  storage(project: Project): Storage | null;
  optimize?: Optimizer;
  ai?: AiProvider;
  /** What this runtime can execute, e.g. `images` needs an optimizer and storage. */
  capabilities: Set<string>;
  fetch: typeof fetch;
}

export class CmsError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
export const notFound = (what: string) => new CmsError(404, 'not_found', `${what} not found.`);
export const invalid = (message: string, details?: unknown) => new CmsError(400, 'invalid', message, details);
export const conflict = (message: string, details?: unknown) => new CmsError(409, 'conflict', message, details);
export const engineActor: Actor = { type: 'engine', id: 'engine', scopes: new Set<Scope>(['read', 'write', 'media', 'publish']), projectIds: '*' };
