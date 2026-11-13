import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: {
    label: string;
    href: string;
  };
  aside?: ReactNode;
  className?: string;
}

/** Framer-style section opener: tight 44px title, optional right-side pill. */
export function SectionHeader({
  title,
  description,
  action,
  aside,
  className = '',
}: SectionHeaderProps) {
  return (
    <Reveal className={`fh-section-header ${className}`}>
      <div className="fh-section-header-copy">
        <h2 className="fh-h2">{title}</h2>
        {description ? <p className="fh-section-lede">{description}</p> : null}
      </div>

      {aside}

      {action ? (
        <Link href={action.href} className="fh-pill fh-pill-secondary fh-section-action">
          {action.label}
          <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      ) : null}
    </Reveal>
  );
}
