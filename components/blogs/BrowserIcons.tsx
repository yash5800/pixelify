import React from 'react';

export const BROWSER_IMAGES: Record<string, string> = {
  chrome: '/blogs/chrome.webp',
  'google-chrome': '/blogs/chrome.webp',
  edge: '/blogs/microsoft-edge.webp',
  msedge: '/blogs/microsoft-edge.webp',
  'microsoft-edge': '/blogs/microsoft-edge.webp',
  firefox: '/blogs/firefox.png',
  'mozilla-firefox': '/blogs/firefox.png',
  brave: '/blogs/brave-browser-icon.webp',
  'brave-browser': '/blogs/brave-browser-icon.webp',
  safari: '/blogs/safari.png',
  'apple-safari': '/blogs/safari.png',
};

interface BrowserIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function BrowserIcon({
  name,
  className = 'w-7 h-7 sm:w-8 sm:h-8 inline-block',
  size = 32,
}: BrowserIconProps) {
  const key = name.toLowerCase().trim();
  const src = BROWSER_IMAGES[key];

  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${name} icon`}
      className={`${className} object-contain shrink-0`}
      loading="lazy"
      width={size}
      height={size}
    />
  );
}

/**
 * Automatically renders a heading title with browser images from public/blogs/.
 * Places the Edge icon specifically to the left of "Microsoft Edge" (or "Edge"),
 * and the Chrome icon to the left of "Chrome".
 */
export function renderHeadingWithBrowserIcons(text: string, customIcons?: string[]): React.ReactNode {
  if (!text) return text;

  const lower = text.toLowerCase();

  // Pattern: Chrome ... (separator) ... (Microsoft Edge | Edge)
  if (lower.includes('chrome') && (lower.includes('edge') || lower.includes('microsoft edge'))) {
    const match = text.match(/^(.*?)(google\s+chrome|chrome)([\s\S]*?)(microsoft\s+edge|edge)(.*)$/i);
    if (match) {
      const [, prefix, chromeText, andText, edgeText, suffix] = match;
      return (
        <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {prefix && <span>{prefix}</span>}
          <span className="inline-flex items-center gap-2">
            <BrowserIcon name="chrome" />
            <span>{chromeText}</span>
          </span>
          <span className="text-white/80">{andText.trim()}</span>
          <span className="inline-flex items-center gap-2">
            <BrowserIcon name="edge" />
            <span>{edgeText}</span>
          </span>
          {suffix && <span>{suffix}</span>}
        </span>
      );
    }
  }

  // Mozilla Firefox or Firefox
  if (lower.includes('firefox')) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <BrowserIcon name="firefox" />
        <span>{text}</span>
      </span>
    );
  }

  // Brave Browser or Brave
  if (lower.includes('brave')) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <BrowserIcon name="brave" />
        <span>{text}</span>
      </span>
    );
  }

  // Apple Safari or Safari
  if (lower.includes('safari')) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <BrowserIcon name="safari" />
        <span>{text}</span>
      </span>
    );
  }

  // Microsoft Edge standalone
  if (lower.includes('edge')) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <BrowserIcon name="edge" />
        <span>{text}</span>
      </span>
    );
  }

  // Chrome standalone
  if (lower.includes('chrome')) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <BrowserIcon name="chrome" />
        <span>{text}</span>
      </span>
    );
  }

  // Fallback if customIcons provided
  if (customIcons && customIcons.length > 0) {
    return (
      <span className="inline-flex items-center gap-2.5">
        <span className="inline-flex items-center gap-2 shrink-0">
          {customIcons.map((ic) => (
            <BrowserIcon key={ic} name={ic} />
          ))}
        </span>
        <span>{text}</span>
      </span>
    );
  }

  return text;
}
