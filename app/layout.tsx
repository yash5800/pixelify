import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import AppProvider from '@/components/AppProvider';

import '@/styles/index.css';
import '@/styles/app.css';
import '@/styles/upscaler-sections.css';
import '@/styles/not-found.css';
import '@/styles/model-loader.css';
import '@/styles/solving-orb.css';
import '@/styles/upscaling-loader.css';
import '@/styles/bgremove-sections.css';
import '@/styles/home.css';

const SITE_URL = 'https://pixelify.me';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Pixelify | Free On-Device AI Photo Editor | Image Upscaler & Background Remover',
  description: 'Pixelify runs AI image upscaling and background removal entirely in your browser. Private, on-device, no uploads, no tracking. Free 4× super-resolution.',
  keywords: [
    'AI image upscaler',
    'photo enhancer',
    'remove background',
    'background remover online',
    'browser AI',
    'on-device AI',
    'WebGPU photo editor',
    'super resolution',
    'private photo editor',
    'free image upscaler',
  ],
  authors: [{ name: 'Pixelify' }],
  applicationName: 'Pixelify',
  appleWebApp: { title: 'Pixelify' },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Pixelify',
    title: 'Pixelify: Free On-Device AI Photo Editor | Upscaler & BG Remover',
    description: 'Upscale photos up to 8x and remove image backgrounds 100% in your browser. Zero cloud uploads, total privacy, powered by client-side WebGPU.',
    url: SITE_URL,
    locale: 'en_US',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Pixelify AI Photo Editor Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pixelify: Free On-Device AI Photo Editor',
    description: 'Upscale images up to 8x and remove backgrounds locally in your browser. Private, fast, and free.',
    images: ['/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0c',
  colorScheme: 'dark light',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://pixelify.me/#website',
      url: 'https://pixelify.me/',
      name: 'Pixelify',
      description: 'Free on-device AI image upscaler and background remover running privately in the browser.',
      inLanguage: 'en-US',
      publisher: {
        '@type': 'Organization',
        name: 'Pixelify',
        url: 'https://pixelify.me/',
        logo: {
          '@type': 'ImageObject',
          url: 'https://pixelify.me/favicon.svg',
        },
      },
    },
    {
      '@type': 'WebApplication',
      '@id': 'https://pixelify.me/#webapp',
      url: 'https://pixelify.me/',
      name: 'Pixelify AI Photo Editor',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'All modern browsers (Chrome, Edge, Firefox, Safari)',
      browserRequirements: 'Requires WebAssembly or WebGPU compatible browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        '8x AI Super-Resolution Image Upscaling',
        'Instant Background Removal (Chopper AI)',
        '100% On-Device In-Browser Processing',
        'Zero Cloud Uploads & Absolute Privacy',
        'Side-by-side Before/After Comparison Slider',
      ],
      image: 'https://pixelify.me/og-image.jpg',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Resource hints — browsers honour them wherever they appear; React hoists <meta>/<link> metadata tags to the head when possible */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
        <link rel="dns-prefetch" href="https://adservice.google.com" />
        <link rel="preload" href="/fonts/Minecrafter.Reg.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        {/* Bing (Next.js Metadata API exposes only the Googlebot variant) */}
        <meta name="bingbot" content="index, follow" />

        {/* Fallback content for crawlers, AdSense reviewers & non-JS browsers */}
        <noscript>
          <div style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '40px auto', padding: 20, lineHeight: 1.6, color: '#111' }}>
            <h1>Pixelify: On-Device AI Photo Editor &amp; Background Remover</h1>
            <p>
              Pixelify delivers high-performance AI image upscaling and instant background removal
              running 100% client-side in your web browser. No cloud uploads, no subscriptions,
              and total data privacy.
            </p>
            <h2>Key Features:</h2>
            <ul>
              <li><strong>AI Image Super-Resolution:</strong> Upscale images up to 4× with models including Vitality, Pixel-Dance, and Alpha-Satoru.</li>
              <li><strong>Chopper AI Background Removal:</strong> Remove backgrounds from portraits, e-commerce products, and graphics in seconds.</li>
              <li><strong>100% On-Device Privacy:</strong> Photos are processed strictly in your device&apos;s memory using WebGPU &amp; WebAssembly. Nothing is ever saved or sent to any remote server.</li>
              <li><strong>Multi-Format Support:</strong> Works with PNG, JPEG, WEBP, and more.</li>
            </ul>
            <h2>Quick Navigation:</h2>
            <ul>
              <li><a href="/upscaler/">AI Image Upscaler Studio</a></li>
              <li><a href="/bg_remove/">AI Background Remover</a></li>
              <li><a href="/blogs/">Articles &amp; AI Technology Guides</a></li>
              <li><a href="/about/">About Pixelify</a></li>
              <li><a href="/products/">Products &amp; Features</a></li>
              <li><a href="/privacy/">Privacy Policy</a></li>
              <li><a href="/terms/">Terms of Service</a></li>
            </ul>
            <p><small>© 2026 Pixelify. All rights reserved. Please enable JavaScript to launch the interactive editor.</small></p>
          </div>
        </noscript>

        <AppProvider>{children}</AppProvider>

        {/* Structured data for Google rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
