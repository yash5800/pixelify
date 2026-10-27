'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Eye, RefreshCw, UsersRound, X } from 'lucide-react';

const SITE = 'pixelify.me';
const API = 'https://page-views-api.ratneshc.com/api/v1';

async function readSiteVisits() {
  // Reuse one aggregate counter key so route names are never sent as analytics data.
  const params = new URLSearchParams({ site: SITE, path: '/' });
  const requestOptions: RequestInit = { cache: 'no-store', referrerPolicy: 'origin' };
  const trackResponse = await fetch(`${API}/track?${params}`, requestOptions);
  if (!trackResponse.ok) throw new Error('Could not record visit');

  const viewsResponse = await fetch(`${API}/views?${params}`, requestOptions);
  if (!viewsResponse.ok) throw new Error('Could not load visit count');

  const data: { views?: number } = await viewsResponse.json();
  if (typeof data.views !== 'number' || !Number.isFinite(data.views)) {
    throw new Error('Invalid visit count');
  }
  return data.views;
}

export default function HomeVisitorCount() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [liveSite, setLiveSite] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setCount(await readSiteVisits());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isLiveSite = window.location.hostname === SITE || window.location.hostname === `www.${SITE}`;
    setLiveSite(isLiveSite);
    // Keep local development and preview deployments out of the public total.
    if (!isLiveSite) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const formattedCount = count?.toLocaleString() ?? (loading ? '…' : '—');

  return (
    <aside className="fixed right-0 top-1/2 z-[80] -translate-y-1/2">
      {open && (
        <section
          id="visitor-count-details"
          role="dialog"
          aria-label="Pixelify visitor count details"
          className="absolute right-full top-1/2 mr-3 w-[min(320px,calc(100vw-76px))] -translate-y-1/2 rounded-2xl border border-white/10 bg-[#101412]/95 p-5 text-white shadow-[0_20px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/75">
                <Eye size={14} /> Community visits
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
                {formattedCount}
              </p>
              <p className="mt-1 text-xs text-white/45">Site visits</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close visitor count details"
              className="rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-4 border-t border-white/[0.08] pt-3 text-xs leading-5 text-white/55">
            {failed
              ? 'The live count is temporarily unavailable. Please try again shortly.'
              : !liveSite
                ? 'This local or preview build can show the badge, but it does not record visits. The live total is available on pixelify.me.'
                : 'This is an approximate visit count, not a count of unique people. Repeat visits are grouped for about 30 minutes. Updates may take a short time to appear.'}
          </p>
          {liveSite && (
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-emerald-200/30 hover:text-white disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Updating…' : 'Refresh count'}
            </button>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? 'visitor-count-details' : undefined}
        aria-label={`Show visitor count details. ${count === null ? 'Count ' + (failed ? 'unavailable' : loading ? 'loading' : 'available on the live website') : `${count.toLocaleString()} site visits`}.`}
        className="flex min-h-[122px] w-[46px] flex-col items-center justify-center gap-2 rounded-l-2xl border border-r-0 border-emerald-300/20 bg-[#0b0e0d]/95 px-2.5 py-3 text-emerald-200 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-emerald-200/45 hover:bg-[#101815] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]"
      >
        <UsersRound size={16} aria-hidden="true" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold tracking-[0.14em]">
          {liveSite ? `${formattedCount} VISITS` : 'VISITORS'}
        </span>
      </button>
    </aside>
  );
}
