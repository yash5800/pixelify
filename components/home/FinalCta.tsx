import Link from 'next/link';
import { Reveal } from './Reveal';

/** Closing spotlight card, keeping the footer's #home-faq anchor resolving. */
export function FinalCta() {
  return (
    <section className="fh-cta-section" id="home-faq">
      <div className="fh-container">
        <Reveal y={30}>
          <div className="fh-cta-card">
            <div className="fh-cta-inner">
              <span className="fh-cta-kicker">
                <i aria-hidden="true" />
                Free · On-device · No sign-up
              </span>
              <h2 className="fh-cta-title">
                Your next image
                <br />
                starts here
              </h2>
              <p className="fh-cta-copy">
                Drop a photo, pick a model, and watch it resolve at 8×. Or cut the
                subject out and design the frame — all before an upload bar would
                have moved.
              </p>
              <div className="fh-cta-actions">
                <Link href="/upscaler/" className="fh-pill fh-pill-primary">
                  Open the upscaler
                </Link>
                <Link href="/bg_remove/" className="fh-pill fh-pill-ghost">
                  Remove a background
                </Link>
              </div>
              <p className="fh-cta-fine">
                PNG · JPG · WebP up to 20 MB · runs locally in Chrome, Safari,
                Firefox and Edge
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
