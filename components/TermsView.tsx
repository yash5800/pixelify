'use client';

import TermsPage from './pages/TermsPage';
import { useApp } from './AppProvider';

export default function TermsView() {
  const { navigateTo } = useApp();
  return <TermsPage onTabChange={navigateTo} />;
}
