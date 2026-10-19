export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'img'; src: string; alt: string; caption?: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'callout'; title: string; text: string };

export type LangCode = 'en' | 'fr' | 'zh' | 'ja' | 'hi' | 'ru';

export interface Language {
  code: LangCode;
  label: string;
  short: string;
}

export interface Post {
  slug: string;
  /** Added by the registry: 'en' | 'fr' | 'zh' | 'ja' | 'hi' | 'ru'. */
  lang: LangCode;
  title: string;
  description: string;
  tags: string[];
  date: string;
  author: string;
  cover: string;
  coverAlt: string;
  blocks: Block[];
}

export interface PostsPage {
  posts: Post[];
  page: number;
  totalPages: number;
  totalPosts: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export declare const LANGUAGES: Language[];
export declare const DEFAULT_LANG: LangCode;
export declare const POSTS_PER_PAGE: number;

export declare function isSupportedLang(code?: string): boolean;
export declare function langShort(code?: string): string;
export declare function langLabel(code?: string): string;
export declare function getAllPosts(lang?: string): Post[];
export declare function getPostsPage(page?: number, perPage?: number, lang?: string): PostsPage;
export declare function getPostBySlug(slug: string, lang?: string): Post | null;
export declare function postPath(post: Post | null): string;
export declare function getRelatedPosts(slug: string, limit?: number, lang?: string): Post[];
export declare function getAllTags(lang?: string): TagCount[];
export declare function postPlainText(post: Post): string;
export declare function getReadTime(post: Post): number;
export declare function formatDate(iso: string): string;
