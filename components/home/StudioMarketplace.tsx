'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { Reveal } from './Reveal';

const MODEL_CARDS = [
  {
    name: 'Vitality',
    author: 'Pixelify · upscaler',
    price: 'Free',
    badge: '4× · fast',
    thumb: 'vitality',
    image: '/home/shots/model-vitality.jpg',
    style: 'Fast',
    scale: 4,
    rank: 3,
    href: '/upscaler/',
  },
  {
    name: 'Pixel-Dance',
    author: 'Pixelify · upscaler',
    price: 'Built in',
    badge: '8K detail',
    thumb: 'dance',
    image: '/home/shots/model-dance.jpg',
    style: 'Detail',
    scale: 8,
    rank: 1,
    href: '/upscaler/',
  },
  {
    name: 'Alpha-Satoru',
    author: 'Pixelify · upscaler',
    price: 'Built in',
    badge: 'Portraits',
    thumb: 'satoru',
    image: '/home/shots/model-satoru.jpg',
    style: 'Portraits',
    scale: 4,
    rank: 2,
    href: '/upscaler/',
  },
  {
    name: 'Chopper',
    author: 'Pixelify · cutout',
    price: 'Free',
    badge: 'Cutout',
    thumb: 'chopper',
    image: '/home/shots/model-chopper.jpg',
    style: 'Cutout',
    scale: 0,
    rank: 4,
    href: '/bg_remove/',
  },
];

const COLUMNS = [
  {
    title: 'Upscaling',
    links: ['Vitality', 'Pixel-Dance', 'Alpha-Satoru', '2× · 4× · 8×', 'Tiled inference'],
  },
  {
    title: 'Cutout',
    links: ['Chopper', 'Diablo', 'Erase brush', 'Restore brush', 'Alpha matte'],
  },
  {
    title: 'Backdrop',
    links: ['Solid colour', 'Photo backdrop', 'Blur original', 'Add photo', 'Drop shadow'],
  },
  {
    title: 'Design',
    links: ['Text', 'Elements', 'Layers', 'Edge stroke', 'Crop & transform'],
  },
  {
    title: 'Export',
    links: ['PNG', 'WebP', 'JPG', 'Full resolution', 'Clipboard'],
  },
];

const NAV = [
  { label: 'Models', href: '/products/', current: true },
  { label: 'Tools', href: '/products/' },
  { label: 'Backdrops', href: '/products/' },
  { label: 'Formats', href: '/docs/' },
  { label: 'Guides', href: '/docs/' },
];

const SORTS = ['Trending', 'Best', 'Recent'] as const;
type SortKey = (typeof SORTS)[number];

/** Framer's marketplace panel, rebuilt as an index of every Pixelify model and tool. */
export function StudioMarketplace() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('Trending');
  const [style, setStyle] = useState('All styles');
  const [scale, setScale] = useState('All scales');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = MODEL_CARDS.filter((card) => {
      if (style !== 'All styles' && card.style !== style) return false;
      if (scale === 'Cutout' && card.scale !== 0) return false;
      if (scale !== 'All scales' && scale !== 'Cutout' && card.scale !== Number(scale[0])) return false;
      if (!needle) return true;
      return `${card.name} ${card.author} ${card.badge} ${card.style}`.toLowerCase().includes(needle);
    });

    if (sort === 'Best') return [...matches].sort((a, b) => a.rank - b.rank);
    if (sort === 'Recent') return [...matches].reverse();
    return matches;
  }, [query, sort, style, scale]);

  const columnHit = query.trim().toLowerCase();

  return (
    <section className="fh-section fh-market" id="marketplace">
      <div className="fh-container">
        <Reveal className="fh-section-header">
          <div className="fh-section-header-copy">
            <h2 className="fh-h2">Explore the studio</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="fh-caption">5 models · 12 tools</span>
            <Link href="/products/" className="fh-pill fh-pill-secondary">
              Browse all features
            </Link>
          </div>
        </Reveal>

        <Reveal y={28}>
          <div className="fh-market-frame">
            <div className="fh-market-chrome">
              <div className="fh-market-chrome-left">
                <i />
                <i />
                <i />
              </div>
              <div className="fh-market-chrome-left">
                <Link href="/" aria-label="Studio home">
                  ⌂
                </Link>
                <Link href="/products/" aria-label="Open the feature index">
                  ▢
                </Link>
              </div>
            </div>

            <div className="fh-market-nav">
              <span className="fh-market-brand">
                <span className="fh-studio-brand-mark">P</span>
                Pixelify Studio
              </span>
              <nav className="fh-market-tabs" aria-label="Studio sections">
                {NAV.map((entry) => (
                  <Link
                    key={entry.label}
                    href={entry.href}
                    className={entry.current ? 'is-active' : ''}
                    aria-current={entry.current ? 'page' : undefined}
                  >
                    {entry.label}
                  </Link>
                ))}
              </nav>
              <label className="fh-market-search">
                <Search size={11} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the studio…"
                  aria-label="Search models and tools"
                />
              </label>
            </div>

            <div className="fh-market-body">
              <div className="fh-market-hero">
                <div>
                  <h3>Models</h3>
                  <p>
                    Every upscaler and cutout model Pixelify ships with. Download
                    once, then run it in the tab as often as you like.
                  </p>
                </div>
                <div className="fh-market-cols">
                  {COLUMNS.map((column) => (
                    <div className="fh-market-col" key={column.title}>
                      <h4>{column.title}</h4>
                      <ul>
                        {column.links.map((link) => (
                          <li
                            key={link}
                            style={
                              columnHit && link.toLowerCase().includes(columnHit)
                                ? { color: '#ededed' }
                                : undefined
                            }
                          >
                            {link}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fh-market-toolbar">
                <div className="fh-market-filters" role="group" aria-label="Sort models">
                  {SORTS.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      className={`fh-ui fh-market-filter${sort === entry ? ' is-active' : ''}`}
                      aria-pressed={sort === entry}
                      onClick={() => setSort(entry)}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
                <div className="fh-market-selects">
                  <span className="fh-market-selectwrap">
                    <select
                      className="fh-ui fh-market-select"
                      value={style}
                      onChange={(event) => setStyle(event.target.value)}
                      aria-label="Filter by style"
                    >
                      {['All styles', 'Fast', 'Detail', 'Portraits', 'Cutout'].map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={10} aria-hidden="true" />
                  </span>
                  <span className="fh-market-selectwrap">
                    <select
                      className="fh-ui fh-market-select"
                      value={scale}
                      onChange={(event) => setScale(event.target.value)}
                      aria-label="Filter by scale"
                    >
                      {['All scales', '2×', '4×', '8×', 'Cutout'].map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={10} aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div className="fh-market-cards">
                {shown.map((card) => (
                  <Link className="fh-market-card" key={card.name} href={card.href}>
                    <div className={`fh-market-thumb fh-market-thumb--${card.thumb}`}>
                      <img src={card.image} alt={`${card.name} sample result`} loading="lazy" />
                      <span>{card.badge}</span>
                    </div>
                    <div className="fh-market-card-meta">
                      <div>
                        <strong>{card.name}</strong>
                        <small>{card.author}</small>
                      </div>
                      <span className="fh-market-price">{card.price}</span>
                    </div>
                  </Link>
                ))}
                {shown.length === 0 ? (
                  <p className="fh-market-empty">
                    No models match this search.{' '}
                    <button
                      type="button"
                      className="fh-ui fh-text-link"
                      onClick={() => {
                        setQuery('');
                        setStyle('All styles');
                        setScale('All scales');
                      }}
                    >
                      Clear the filters
                    </button>
                  </p>
                ) : null}
              </div>
              <p className="fh-sr" role="status">
                {shown.length} model{shown.length === 1 ? '' : 's'} shown
                {query.trim() ? ` for “${query.trim()}”` : ''}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
