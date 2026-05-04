import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type CategoryMeta = {
  label: string;
  icon: IoniconName;
  color: string;
};

const TOP_LEVEL: Record<string, CategoryMeta> = {
  '01': { label: 'Receitas', icon: 'cash-outline', color: '#34d399' },
  '02': { label: 'Empréstimos', icon: 'trending-down-outline', color: '#f97316' },
  '03': { label: 'Investimentos', icon: 'trending-up-outline', color: '#a78bfa' },
  '04': { label: 'Transf. próprias', icon: 'swap-horizontal-outline', color: '#9ca3af' },
  '05': { label: 'Transferências', icon: 'arrow-redo-outline', color: '#60a5fa' },
  '06': { label: 'Obrigações legais', icon: 'document-text-outline', color: '#94a3b8' },
  '07': { label: 'Serviços', icon: 'construct-outline', color: '#818cf8' },
  '08': { label: 'Compras', icon: 'bag-handle-outline', color: '#f472b6' },
  '09': { label: 'Serviços digitais', icon: 'laptop-outline', color: '#38bdf8' },
  '10': { label: 'Mercado', icon: 'basket-outline', color: '#a3e635' },
  '11': { label: 'Comida e bebida', icon: 'restaurant-outline', color: '#fb923c' },
  '12': { label: 'Viagens', icon: 'airplane-outline', color: '#2dd4bf' },
  '13': { label: 'Doações', icon: 'heart-outline', color: '#fb7185' },
  '14': { label: 'Apostas', icon: 'dice-outline', color: '#e879f9' },
  '15': { label: 'Impostos', icon: 'receipt-outline', color: '#fbbf24' },
  '16': { label: 'Tarifas bancárias', icon: 'card-outline', color: '#a8a29e' },
  '17': { label: 'Moradia', icon: 'home-outline', color: '#10b981' },
  '18': { label: 'Saúde', icon: 'medkit-outline', color: '#ef4444' },
  '19': { label: 'Transporte', icon: 'car-outline', color: '#3b82f6' },
  '20': { label: 'Seguros', icon: 'shield-checkmark-outline', color: '#06b6d4' },
  '21': { label: 'Lazer', icon: 'game-controller-outline', color: '#8b5cf6' },
};

const FALLBACK: CategoryMeta = {
  label: 'Outros',
  icon: 'ellipsis-horizontal-circle-outline',
  color: '#6b7280',
};

export function getCategoryMeta(categoryId: string | null | undefined): CategoryMeta {
  if (!categoryId) return FALLBACK;
  const prefix = categoryId.slice(0, 2);
  return TOP_LEVEL[prefix] ?? FALLBACK;
}

export function getTopLevelCategories(): Array<CategoryMeta & { prefix: string }> {
  return Object.entries(TOP_LEVEL).map(([prefix, meta]) => ({ prefix, ...meta }));
}

export function categoryMatchesPrefix(categoryId: string | null | undefined, prefix: string): boolean {
  if (!categoryId) return prefix === 'other';
  return categoryId.slice(0, 2) === prefix;
}
