/**
 * Intrinsic dimensions for the finite set of static blog images in
 * /public/blogs. Supplying width/height to every <img> avoids layout
 * shift before the CSS aspect boxes paint and lets the browser reserve
 * the final aspect ratio from the HTML alone.
 */
const BLOG_IMAGE_DIMS: Record<string, readonly [number, number]> = {
  '/blogs/bgremove-page.jpg': [1600, 1000],
  '/blogs/bgremove-showcase.jpg': [1600, 1000],
  '/blogs/home-hero.jpg': [1600, 1000],
  '/blogs/home-mobile.jpg': [1080, 1920],
  '/blogs/home-samples.jpg': [1600, 1000],
  '/blogs/settings-engine.jpg': [1600, 1000],
  '/blogs/story-page.jpg': [1600, 1000],
  '/blogs/upscaler-page.jpg': [1600, 1000],
  '/blogs/upscaler-sections.jpg': [1600, 1000],
};

export function getBlogImageDims(src: string): { width: number; height: number } | undefined {
  const dims = BLOG_IMAGE_DIMS[src];
  if (!dims) return undefined;
  return { width: dims[0], height: dims[1] };
}
