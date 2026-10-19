'use client';

import dynamic from 'next/dynamic';
import type { TruckSceneProps } from './TruckScene';

const TruckScene = dynamic(() => import('./TruckScene'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="w-full"
      style={{ height: 'min(60vh, 520px)' }}
    />
  ),
});

export default function TruckSceneClient(props: TruckSceneProps) {
  return <TruckScene {...props} />;
}
