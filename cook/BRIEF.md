# Brief: Pixelify home page in the Framer design system

Target: Rebuild the Pixelify home page so every section below the existing hero matches the structure, spacing, typography, card language and scroll motion of framer.com, with Pixelify's upscaler and background remover as the content. Keep the existing hero typeface (Plus Jakarta Sans) and improve the hero only where it helps. Do not modify `components/Footer.tsx`.

Stack: Next.js 14 App Router, TypeScript, Tailwind (existing), framer-motion, lucide-react, plain CSS for the product mockups.

References:
- `cook/refs/R01.png` — user's full-page capture of the Framer home.
- Live https://www.framer.com/ captured 2026-11-13 at 1440px: hero, logo row, "The website builder for shipping standout sites", "Build your website together with agents" (big canvas + agent cards + CMS + code + MCP), "Not just vibes, a full platform" bento, "Shipped with Framer" gallery, "Trusted by teams shipping big sites", "Explore the marketplace", "Your next idea starts here", footer.
- `DESIGN.md` — extracted design system: canvas #090909, surface-1 #141414, surface-2 #1c1c1c, hairline #262626, ink #fff, ink-muted #999, accent-blue #0099ff, GT Walsheim display / Inter body, 44px section titles at -1.76px tracking, 96px section rhythm, 20px card radius, 100px pill CTA, gradient spotlight cards.

Bar: composition 99, materials 99, color 99, detail 99, motion 9/10 (eyeballed; Framer reference ~8.5).

Rules:
- Pixelify copy, Framer design.
- Existing real project images only (public/home, public/showcase). No external assets.
- No new fonts. Hero keeps Plus Jakarta Sans. New sections use Inter (already loaded) and tight Framer tracking.
- Keep existing global Navbar for round 1; restyle only if the page reads wrong next to the reference.
- No purple gradient default; use the documented neutral canvas plus one blue signal and a single subtle gradient spotlight card.
- Improve hero colours/CTAs toward the Framer palette without changing the hero font.

Deliverable: working home page at `/`, screenshots, side-by-side comparisons, and a round ledger.

Permissions: local edits and local commits only. No deploy.

User's words: "i want u to design home page to match 99.99% of given insperation site", "see the insperation site live demos,animation,scroll in animation, and other importent", "note: improve hero section if needed don't change it's font,don't modify the footer".
