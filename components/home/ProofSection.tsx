import Link from 'next/link';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

const USE_CASES = [
  {
    kicker: 'Photography',
    title: 'Rescue detail from old shoots.',
    copy: '8× tiled upscaling holds texture in faces, fabric and film grain — without sending originals to a cloud.',
    image: '/home/shots/proof-photography.jpg',
    alt: 'Studio portrait upscaled locally with Pixelify',
  },
  {
    kicker: 'E-commerce',
    title: 'Cut products out on the spot.',
    copy: 'Chopper isolates the subject, then Backdrop places it on a clean scene, a solid colour or the blurred original.',
    image: '/home/shots/proof-commerce.jpg',
    alt: 'Running shoes cut out and placed on a dark backdrop',
  },
  {
    kicker: 'Social',
    title: 'Sharpen before it posts.',
    copy: 'Upscale stills and frames to 8×, then crop and set type on the same canvas before exporting.',
    image: '/home/shots/proof-social.jpg',
    alt: 'Night car shot enhanced for social publishing',
  },
  {
    kicker: 'Archives',
    title: 'Restore without the upload.',
    copy: 'Family photos and scans stay on the machine. The model is cached after the first run, so the next pass is faster.',
    image: '/home/shots/proof-archive.jpg',
    alt: 'Black and white dog portrait processed locally with Pixelify',
  },
];

const STATS = [
  { value: '100%', label: 'on-device processing' },
  { value: '0', label: 'bytes sent to a server' },
  { value: '5', label: 'upscale and cutout models' },
  { value: '8×', label: 'maximum resolution scale' },
];

/** Framer's "trusted by teams" band, reframed as honest use cases + product facts. */
export function ProofSection() {
  return (
    <section className="fh-section fh-proof" id="use-cases">
      <div className="fh-container">
        <Reveal className="fh-section-header">
          <div className="fh-section-header-copy">
            <h2 className="fh-h2">Built for images that have to ship</h2>
            <p className="fh-section-lede">
              Photographers, product teams and archives use Pixelify when the file
              cannot leave the machine.
            </p>
          </div>
          <Link href="/docs/" className="fh-pill fh-pill-secondary fh-section-action">
            Read the docs
          </Link>
        </Reveal>

        <RevealGroup className="fh-proof-grid" stagger={0.08}>
          {USE_CASES.map((item) => (
            <RevealItem key={item.kicker} className="fh-proof-card">
              <img src={item.image} alt={item.alt} loading="lazy" />
              <span className="fh-proof-kicker">{item.kicker}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.08} className="fh-proof-stats">
          {STATS.map((stat) => (
            <div className="fh-proof-stat" key={stat.label}>
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
