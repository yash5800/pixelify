'use client';

import BlogList from './blogs/BlogList';
import { useApp } from './AppProvider';

export default function BlogListView({ initialLang }: { initialLang?: string }) {
  const { navigateTo } = useApp();
  return <BlogList onTabChange={navigateTo} initialLang={initialLang} />;
}
