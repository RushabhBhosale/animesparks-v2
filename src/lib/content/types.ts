export interface R2Asset { sanityId?: string; r2Key?: string; publicUrl?: string | null }
export interface ContentImage { _type?: 'image'; alt?: string; asset?: R2Asset }
export interface PortableSpan { _type: 'span'; text?: string; marks?: string[] }
export interface PortableMarkDef { _key: string; _type: string; href?: string }
export interface PortableBlock {
  _key?: string;
  _type: string;
  style?: string;
  children?: PortableSpan[];
  markDefs?: PortableMarkDef[];
  listItem?: string;
  level?: number;
  alt?: string;
  caption?: string;
  asset?: R2Asset;
}
export interface CategoryDocument { sanityId: string; title: string; slug: string; description?: string; publicationState?: string }
export interface AuthorDocument { sanityId: string; name: string; slug?: string; bio?: PortableBlock[]; image?: ContentImage }
export interface AnimeEntryDocument { sanityId: string; publicationState: string; title: string; score: number; coverImage?: string | null; bannerImage?: string | null; genres?: string[]; year?: number }
export interface ArticleDocument {
  sanityId: string;
  publicationState: 'published' | 'draft' | string;
  language: 'en' | 'es';
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  publishedAt?: string;
  updatedAt?: string;
  sourceUpdatedAt?: string;
  articleType?: string;
  animeName?: string;
  mainImage?: ContentImage;
  body?: PortableBlock[];
  authorSanityId?: string;
  categorySanityIds?: string[];
  translationOfSanityId?: string;
  tags?: string[];
  viewCount?: number;
  faq?: Array<{ question?: string; answer?: string }>;
  sources?: Array<{ name?: string; url?: string }>;
  updateHistory?: Array<{ date?: string; summary?: string }>;
  internalLinks?: unknown[];
}
export interface HomepageSettingsDocument {
  editorsPicks?: Array<{ sanityId: string }>;
  moreBlogs?: Array<{ sanityId: string }>;
}
export interface ArticleCard extends ArticleDocument {
  categories: CategoryDocument[];
  author?: AuthorDocument;
}
export interface ArticlePageData extends ArticleCard { alternateSlug?: string }
export interface CategoryWithArticles extends CategoryDocument { count: number; cover?: ArticleCard }
export interface AnimeCluster { name: string; count: number; cover?: ContentImage }
export interface HomePageData {
  featured: ArticleCard | null;
  editorsPicks: ArticleCard[];
  latest: ArticleCard[];
  popular: ArticleCard[];
  sections: CategoryDocument[];
  trending: ArticleCard[];
  animeClusters: AnimeCluster[];
  spanish: ArticleCard[];
}
