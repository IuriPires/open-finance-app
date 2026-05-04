import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type CategoryAggregate } from '../../lib/api';
import { getCategoryMeta } from '../../lib/categories';

export default function InsightsScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['insights', itemId],
    queryFn: () => api.getInsights(itemId!),
    enabled: !!itemId,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Erro ao carregar insights'}
        </Text>
      </View>
    );
  }

  const { totalSpent, previousTotalSpent, categories, month } = data;
  const monthLabel = formatMonth(month);
  const totalDelta =
    previousTotalSpent > 0
      ? ((totalSpent - previousTotalSpent) / previousTotalSpent) * 100
      : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Gastos em {monthLabel}</Text>
        <Text style={styles.heroValue}>{formatBRL(totalSpent)}</Text>
        {totalDelta != null ? (
          <View style={styles.deltaRow}>
            <Ionicons
              name={totalDelta >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={totalDelta >= 0 ? '#f87171' : '#34d399'}
            />
            <Text style={[styles.deltaText, totalDelta >= 0 ? styles.deltaUp : styles.deltaDown]}>
              {Math.abs(totalDelta).toFixed(1)}% vs mês anterior
            </Text>
          </View>
        ) : previousTotalSpent === 0 ? (
          <Text style={styles.heroSub}>Sem gastos no mês anterior</Text>
        ) : null}
      </View>

      {categories.length > 0 ? (
        <>
          <StackedBar categories={categories} totalSpent={totalSpent} />

          <View style={styles.list}>
            {categories.map((cat) => (
              <CategoryRow key={cat.prefix} cat={cat} totalSpent={totalSpent} />
            ))}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.muted}>Sem gastos em {monthLabel}.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StackedBar({
  categories,
  totalSpent,
}: {
  categories: CategoryAggregate[];
  totalSpent: number;
}) {
  if (totalSpent === 0) return null;
  return (
    <View style={styles.barContainer}>
      <View style={styles.bar}>
        {categories.map((cat, i) => {
          const meta = getCategoryMeta(`${cat.prefix}000000`);
          const widthPct = (cat.total / totalSpent) * 100;
          return (
            <View
              key={cat.prefix}
              style={[
                styles.barSegment,
                { backgroundColor: meta.color, flexBasis: `${widthPct}%` },
                i === 0 && styles.barSegmentFirst,
                i === categories.length - 1 && styles.barSegmentLast,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function CategoryRow({
  cat,
  totalSpent,
}: {
  cat: CategoryAggregate;
  totalSpent: number;
}) {
  const meta = getCategoryMeta(`${cat.prefix}000000`);
  const pct = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${meta.color}22` }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowLabel}>{meta.label}</Text>
          <Text style={styles.rowAmount}>{formatBRL(cat.total)}</Text>
        </View>
        <View style={styles.rowBarTrack}>
          <View
            style={[
              styles.rowBarFill,
              { backgroundColor: meta.color, width: `${pct}%` },
            ]}
          />
        </View>
        <View style={styles.rowMetaLine}>
          <Text style={styles.rowMeta}>
            {cat.count} {cat.count === 1 ? 'transação' : 'transações'} · {pct.toFixed(0)}% do total
          </Text>
          {cat.deltaPct != null ? (
            <Text style={[styles.rowDelta, cat.deltaPct >= 0 ? styles.deltaUp : styles.deltaDown]}>
              {cat.deltaPct >= 0 ? '+' : ''}
              {cat.deltaPct.toFixed(1)}%
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatBRL(value: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { paddingVertical: 16, paddingHorizontal: 8, gap: 4 },
  heroLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  heroSub: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  deltaText: { fontSize: 13, fontWeight: '600' },
  deltaUp: { color: '#f87171' },
  deltaDown: { color: '#34d399' },
  barContainer: { paddingHorizontal: 4 },
  bar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
  },
  barSegment: { height: '100%' },
  barSegmentFirst: { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
  barSegmentLast: { borderTopRightRadius: 7, borderBottomRightRadius: 7 },
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 6 },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowAmount: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rowBarTrack: { height: 4, backgroundColor: '#0f1115', borderRadius: 2, overflow: 'hidden' },
  rowBarFill: { height: '100%', borderRadius: 2 },
  rowMetaLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowMeta: { color: '#9ca3af', fontSize: 11 },
  rowDelta: { fontSize: 12, fontWeight: '700' },
  empty: { padding: 24, alignItems: 'center' },
  muted: { color: '#9ca3af', fontSize: 13 },
  error: { color: '#f87171', fontSize: 14 },
});
