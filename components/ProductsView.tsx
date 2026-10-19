'use client';

import ProductsPage from './pages/ProductsPage';
import { useApp } from './AppProvider';

export default function ProductsView() {
  const { navigateTo } = useApp();
  return <ProductsPage onTabChange={navigateTo} />;
}
