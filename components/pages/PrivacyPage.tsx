import React from 'react';
import type { ViewTab } from '../../types';
import PageShell, { Section, P, UL, Callout } from './PageShell';

interface Props {
  onTabChange: (tab: ViewTab) => void;
}

const TOC = [
  { id: 'summary', label: 'The short version' },
  { id: 'what-we-dont', label: 'What we never collect' },
  { id: 'what-we-store', label: 'What your browser stores' },
  { id: 'network', label: 'Network requests' },
  { id: 'ads', label: 'Advertising (AdSense)' },
  { id: 'thirdparties', label: 'Third parties' },
  { id: 'rights', label: 'Your rights & choices' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPage({ onTabChange }: Props) {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="Pixelify processes your images on your own device. This policy lists exactly what
      that means: what is stored, what is requested over the network, and what never happens."
      updated="Last updated: October 12, 2026"
      toc={TOC}
      documentTitle="Privacy Policy: Pixelify"
      metaDescription="Pixelify's privacy policy: no accounts, no image uploads, no analytics, no
      first-party cookies. What your browser stores locally and which network requests the site makes, in full."
      onTabChange={onTabChange}
    >
      <Section id="summary" num={1} title="The short version">
        <Callout title="If you read nothing else">
          <ul className="space-y-1.5">
            <li>· Your images are never uploaded. All processing happens inside your browser.</li>
            <li>· We have no accounts, so we hold no names, emails or passwords.</li>
            <li>· No analytics, no tracking pixels, no first-party cookies.</li>
            <li>
              · The site is supported by Google AdSense ads. Ad providers set their own cookies
              (see "Advertising").
            </li>
            <li>
              · The only data stored about you is stored by your browser on your device (theme and
              sound preferences, cached model files). You can delete it all in one step.
            </li>
          </ul>
        </Callout>
        <P>
          This policy applies to the Pixelify website and its tools (the AI Image Upscaler and the
          Background Remover). It is written to be verifiable: where we describe data handling, we
          describe the behaviour of the actual application, and you are welcome to check it against
          the source.
        </P>
      </Section>

      <Section id="what-we-dont" num={2} title="What we never collect">
        <P>Because Pixelify has no backend, the following are structurally impossible:</P>
        <UL
          items={[
            <>
              <strong>Your images.</strong> Files you drop, paste or select are read into memory on your device. No pixel, thumbnail or file name is transmitted to us or to any image-processing server.
            </>,
            <>
              <strong>Account data.</strong> There is no registration, login, email capture or password.
               We could not hold account data even if we wanted to.
            </>,
            <>
              <strong>Payment data.</strong>
              The tools are free. There are no purchases and no payment processors.
            </>,
            <>
              <strong>Analytics.</strong>
              No analytics scripts, no pixels, no session replay, no A/B testing tools.
            </>,
            <>
              <strong>Selling data.</strong> We have no bulk data to sell and no advertising
              relationship that involves your content. The ad partner only sees what ad
              networks see on any site (see "Advertising").
            </>,
            <>
              <strong>Cookies.</strong>
              Pixelify sets no cookies of its own. Embedded ad providers set theirs (their
              cookies, not ours). See "Advertising".
            </>,
            <>
              <strong>Location and device fingerprints.</strong>
              No geolocation requests, no fingerprinting scripts.
            </>,
          ]}
        />
      </Section>

      <Section id="what-we-store" num={3} title="What your browser stores">
        <P>
          A few things are stored <em>locally, by your browser, on your device</em>. We never
          receive them; they exist only as your browser's site data. You can delete all of it at
          any time via your browser's "clear site data" control for this site, which resets
          Pixelify to a first-visit state.
        </P>
        <UL
          items={[
            <>
              <strong>Preferences (local storage).</strong> Your theme choice (dark / light /
              system) and the sound-on/off setting for the completion chime. Two small key-value
              entries, no identifiers attached.
            </>,
            <>
              <strong>Model cache (Cache Storage).</strong> Neural model files you have used
              (roughly 2MB to 67MB for the upscaler, about 40MB for the background remover) are cached so
              they do not re-download on every visit. These are stock model weights, not data
              about you.
            </>,
            <>
              <strong>Images, session only.</strong> Your images live in memory for as long as the
              tab is open. Closing or refreshing the tab discards them. Nothing is written to
              persistent storage; a legacy local history feature existed in earlier versions and
              has been removed and actively deleted on load.
            </>,
          ]}
        />
      </Section>

      <Section id="network" num={4} title="Network requests the site makes">
        <P>
          Honesty requires listing these, because "runs locally" describes your images, not the
          ordinary requests a browser makes to load any website. Pixelify makes the following
          requests, none of which carry your images or any personal data:
        </P>
        <UL
          items={[
            <>
              <strong>The site itself.</strong> The application files are served by our hosting
              provider, Vercel. Like every web server, Vercel receives standard request logs
              (IP address, user agent, time, page requested) for delivering the site. See the
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer"> Vercel Privacy Policy</a>.
            </>,
            <>
              <strong>Model files.</strong> Upscaler models are fetched from the same domain as the
              site and then cached by your browser. The background remover's Chopper model is
              downloaded through Transformers.js from the
              <a href="https://huggingface.co" target="_blank" rel="noreferrer"> Hugging Face</a> model hub. It is a one-time ~40 MB file that is then cached. These requests contain a URL and nothing about your images.
            </>,
            <>
              <strong>Open-source libraries.</strong> ONNX Runtime Web (the inference engine) and
              its WebAssembly binaries are loaded from
              <a href="https://www.jsdelivr.com" target="_blank" rel="noreferrer"> jsDelivr</a>, a public content-delivery network. jsDelivr serves the library file; it never sees your images.
            </>,
            <>
              <strong>Fonts.</strong> Typefaces are served by Google Fonts. Google receives the
              standard request data involved in serving a font (IP address, user agent). If you
              prefer to block it entirely, the site remains fully usable with system fonts.
            </>,
          ]}
        />
        <P>
          That is the complete list of requests the site itself makes. Advertising (AdSense) adds
          one more, described in its own section below, since it involves third-party cookies.
        </P>
      </Section>

      <Section id="ads" num={5} title="Advertising (Google AdSense)">
        <P>
          Pixelify is free and has no accounts; the ads keep it that way. The site uses
          <strong> Google AdSense</strong> for advertising:
        </P>
        <UL
          items={[
            <>
              <strong>What loads.</strong> AdSense scripts (from googlesyndication.com and related
              Google domains) are embedded in the page. They run Google's code, not ours.
            </>,
            <>
              <strong>Cookies.</strong> Google uses cookies (including DoubleClick/DART cookies)
              to serve ads based on your prior visits to this and other sites. These are set and
              controlled by Google. Pixelify never sees the values. You can opt out of
              personalized advertising in Google's
              <a href="https://adssettings.google.com" target="_blank" rel="noreferrer"> Ads Settings</a>,
              or via <a href="https://www.aboutads.info" target="_blank" rel="noreferrer">aboutads.info</a>.
            </>,
            <>
              <strong>Images stay local.</strong> The ad scripts have no relationship with the
              AI tools. Your images are still never uploaded or shared with any ad network; there
              is no cross-talk between files in your workspace and the ad slot.
            </>,
            <>
              <strong>Where ads appear.</strong> Ads are limited to content pages (articles, blog,
              landing pages), not inside the AI workspaces.
            </>,
          ]}
        />
        <P>
          For details on how Google handles ad data, read
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer"> Google's Advertising policies</a>.
        </P>
      </Section>

      <Section id="thirdparties" num={6} title="Third parties">
        <P>
          Summarised: <strong>Vercel</strong> (hosting), <strong>Hugging Face</strong>
          (background-removal model weights), <strong>jsDelivr</strong> (inference libraries),
          <strong> Google Fonts</strong> (typefaces) and <strong>Google AdSense</strong>
          (advertising). Each processes the limited request data
          described above under its own privacy policy; we have no commercial relationship with
          them that involves your content, and we do not send them anything beyond ordinary asset
          requests.
        </P>
        <P>
          External links inside our articles lead to third-party sites. Their practices are governed
          by their own policies, not ours.
        </P>
      </Section>

      <Section id="rights" num={7} title="Your rights & choices">
        <P>
          Because we hold no personal data, there is no stored profile to access, correct, export
          or delete on our side; the usual data-subject requests have nothing to attach to. The
          data that exists about your usage lives in your browser, under your control:
        </P>
        <UL
          items={[
            'Clear site data for this origin in your browser settings to erase preferences and model caches instantly.',
            'Block notifications: the optional desktop "done" alert uses the browser notification permission, which you can grant, deny or revoke at any time in browser settings. We ask only when you start a job.',
            'Use private/incognito browsing and nothing persists at all after the tab closes.',
          ]}
        />
        <P>
          If you are in a jurisdiction with statutory data rights (GDPR, CCPA and similar), you
          hold all of them; to the extent any apply, note that the exercise cost to us is zero,
          since there is no database to query.
        </P>
      </Section>

      <Section id="children" num={8} title="Children">
        <P>
          Pixelify collects no data from anyone, including children, and is not directed at children
          under 13 (or the equivalent age in your jurisdiction). Since there is no account system
          and no data collection, no parental consent mechanism exists or is required.
        </P>
      </Section>

      <Section id="changes" num={9} title="Changes to this policy">
        <P>
          If this policy ever changes, for example if a future feature involves a server, the
          updated version will be published on this page with a revised date at the top, and any
          change that alters what leaves your device will be called out on the products page and
          the blog before it takes effect. We do not notify users individually because we have no
          way to reach you, which is the point.
        </P>
      </Section>

      <Section id="contact" num={10} title="Contact">
        <P>
          Questions about privacy, or requests for clarification about anything above, are welcome.
          The fastest route is a GitHub issue:
        </P>
        <Callout title="Privacy contact">
          <p>
            <a href="https://github.com/yash5800/pixelify/issues" target="_blank" rel="noreferrer">
              github.com/yash5800/pixelify/issues
            </a>
            {'. '}Open an issue labelled "privacy" and we will respond. If your question is
            sensitive, say so in the issue title and we will suggest a private channel.
          </p>
        </Callout>
      </Section>
    </PageShell>
  );
}
