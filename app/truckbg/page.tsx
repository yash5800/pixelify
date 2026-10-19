import type { Metadata } from 'next';
import TruckBgView from '@/components/TruckBgView';

export const metadata: Metadata = {
  title: 'Pixelify Truck Playground',
  description: 'An experimental canvas playground built by the Pixelify team.',
  alternates: { canonical: '/truckbg/' },
  robots: { index: false, follow: false },
};

export default function TruckPage() {
  return <TruckBgView />;
}
