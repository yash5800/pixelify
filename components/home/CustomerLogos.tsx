'use client';

import { AppWindow, Boxes, Compass, Cpu, Flame, Globe, Smile, Zap } from 'lucide-react';
import { RevealGroup, RevealItem } from './Reveal';

const CUSTOMERS = [
  { name: 'ONNX Runtime', className: 'fh-logo-onnx', icon: Boxes },
  { name: 'WebGPU', className: 'fh-logo-webgpu', icon: Cpu },
  { name: 'Hugging Face', className: 'fh-logo-hf', icon: Smile },
  { name: 'LiteRT', className: 'fh-logo-litert', icon: Zap },
  { name: 'Chrome', className: 'fh-logo-chrome', icon: Globe },
  { name: 'Safari', className: 'fh-logo-safari', icon: Compass },
  { name: 'Firefox', className: 'fh-logo-firefox', icon: Flame },
  { name: 'Edge', className: 'fh-logo-edge', icon: AppWindow },
];

/** Monochrome tech logo band, mirroring Framer's two rows of four. */
export function CustomerLogos() {
  return (
    <section className="fh-logos" aria-label="Pixelify runs on open web technology">
      <div className="fh-container">
        <RevealGroup className="fh-logos-grid">
          {CUSTOMERS.map((customer) => {
            const Icon = customer.icon;
            return (
              <RevealItem key={customer.name} className="fh-logo-cell">
                <span className={`fh-logo-mark ${customer.className}`}>
                  <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                  {customer.name}
                </span>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
