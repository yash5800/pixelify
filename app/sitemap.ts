import type { MetadataRoute } from 'next';
import { getAllPosts, postPath, LANGUAGES } from '@/data/posts';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/upscaler/',
    '/bg_remove/',
    '/blogs/',
    '/about/',
    '/products/',
    '/privacy/',
    '/terms/',
    '/story/',
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.startsWith('/upscaler') || path.startsWith('/bg_remove') || path.startsWith('/blogs') ? 0.9 : 0.5,
  }));

  // Localized blog index pages: /blogs/<lang>/
  const langIndexEntries: MetadataRoute.Sitemap = LANGUAGES.map((lang) => ({
    url: `${SITE_URL}/blogs/${lang.code}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}${postPath(post)}`,
    lastModified: new Date(post.date),
    changeFrequency: 'yearly',
    priority: 0.7,
  }));

  return [...staticEntries, ...langIndexEntries, ...postEntries];
}
