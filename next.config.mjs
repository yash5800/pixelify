/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // `next build` and `next dev` share the `.next` directory, so a build that
  // runs next to a dev server corrupts it (missing BUILD_ID, broken pages).
  // NEXT_DIST_DIR lets a build use its own directory and run in parallel.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
