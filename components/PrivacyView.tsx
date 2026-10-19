'use client';

import PrivacyPage from './pages/PrivacyPage';
import { useApp } from './AppProvider';

export default function PrivacyView() {
  const { navigateTo } = useApp();
  return <PrivacyPage onTabChange={navigateTo} />;
}
