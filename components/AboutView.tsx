'use client';

import AboutPage from './pages/AboutPage';
import { useApp } from './AppProvider';

export default function AboutView() {
  const { navigateTo } = useApp();
  return <AboutPage onTabChange={navigateTo} />;
}
