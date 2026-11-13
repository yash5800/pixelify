import Link from 'next/link';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

interface GalleryItem {
  src: string;
  alt: string;
  title: string;
  meta: string;
  tag: string;
  className: string;
  checker?: boolean;
  position?: string;
}

const RESULTS: GalleryItem[] = [
  {
    src: '/home/shots/gel-portrait.jpg',
    alt: 'Studio portrait under gel lighting upscaled 4× with Pixelify',
    title: 'Gel portrait',
    meta: 'Vitality · 4×',
    tag: 'Upscaled',
    className: 'fh-gallery-item--a',
    position: 'center 16%',
  },
  {
    src: '/home/shots/cut-dog.webp',
    alt: 'Golden retriever cut out on a transparent background by Pixelify',
    title: 'Retriever',
    meta: 'Chopper · alpha matte',
    tag: 'Cutout',
    className: 'fh-gallery-item--b',
    checker: true,
  },
  {
    src: '/home/shots/editorial.jpg',
    alt: 'Editorial portrait upscaled 4× with Pixelify',
    title: 'Editorial',
    meta: 'Alpha-Satoru · 4×',
    tag: 'Upscaled',
    className: 'fh-gallery-item--c',
    position: 'center 24%',
  },
  {
    src: '/home/shots/cut-gel.webp',
    alt: 'Studio model cut out on a transparent background by Pixelify',
    title: 'Studio cutout',
    meta: 'Chopper · alpha matte',
    tag: 'Cutout',
    className: 'fh-gallery-item--d',
    checker: true,
  },
  {
    src: '/home/shots/on-set.jpg',
    alt: 'Photographer on a lit set, frame upscaled with Pixelify',
    title: 'On set',
    meta: 'Pixel-Dance · 4×',
    tag: 'Upscaled',
    className: 'fh-gallery-item--e',
    position: 'center 30%',
  },
  {
    src: '/home/shots/dog-black.jpg',
    alt: 'Golden retriever portrait restored and upscaled with Pixelify',
    title: 'Retriever study',
    meta: 'Alpha-Satoru · 4×',
    tag: 'Upscaled',
    className: 'fh-gallery-item--f',
    position: 'center 30%',
  },
  {
    src: '/home/shots/night-drive.jpg',
    alt: 'Car photographed at night and upscaled 4× with Pixelify',
    title: 'Night drive',
    meta: 'Pixel-Dance · 4×',
    tag: 'Upscaled',
    className: 'fh-gallery-item--g',
    position: 'center 52%',
  },
  {
    src: '/home/shots/cut-sneaker.webp',
    alt: 'Pair of running shoes cut out on a transparent background by Pixelify',
    title: 'Runner',
    meta: 'Chopper · alpha matte',
    tag: 'Cutout',
    className: 'fh-gallery-item--h',
    checker: true,
  },
];

/** Framer's "Shipped with Framer" gallery, filled with real Pixelify results. */
export function ResultsGallery() {
  return (
    <section className="fh-section fh-gallery" id="gallery">
      <div className="fh-container">
        <Reveal className="fh-section-header">
          <div className="fh-section-header-copy">
            <h2 className="fh-h2">Enhanced with Pixelify</h2>
            <p className="fh-section-lede">
              Sample renders from the five studio models — upscales, alpha
              mattes and backdrops, all processed in the tab.
            </p>
          </div>
          <Link href="/products/" className="fh-pill fh-pill-secondary fh-section-action">
            See the gallery
          </Link>
        </Reveal>

        <RevealGroup className="fh-gallery-grid" stagger={0.06}>
          {RESULTS.map((item) => (
            <RevealItem
              key={item.title}
              y={18}
              className={`fh-gallery-item ${item.className}${item.checker ? ' fh-gallery-checker' : ''}`}
            >
              <img
                src={item.src}
                alt={item.alt}
                loading="lazy"
                style={item.position ? { objectPosition: item.position } : undefined}
              />
              <div className="fh-gallery-label">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <span className="fh-gallery-tag">{item.tag}</span>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
