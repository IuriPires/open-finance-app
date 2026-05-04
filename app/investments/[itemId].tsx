import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type InvestmentItem } from '../../lib/api';

const TYPE_LABEL_PT: Record<string, string> = {
  MUTUAL_FUND: 'Fundo de Investimento',
  SECURITY: 'Previdência / Tesouro',
  EQUITY: 'Ações',
  COE: 'COE',
  FIXED_INCOME: 'Renda Fixa',
  ETF: 'ETF',
  OTHER: 'Outros',
};

const TYPE_COLOR: Record<string, string> = {
  MUTUAL_FUND: '#3b82f6',
  SECURITY: '#a78bfa',
  EQUITY: '#34d399',
  COE: '#f59e0b',
  FIXED_INCOME: '#10b981',
  ETF: '#06b6d4',
  OTHER: '#6b7280',
};

export default function InvestmentsScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['investments', itemId],
    queryFn: () => api.getInvestments(itemId!),
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
          {error instanceof Error ? error.message : 'Erro ao carregar investimentos'}
        </Text>
      </View>
    );
  }

  const grouped = groupByType(data.investments);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Patrimônio investido</Text>
        <Text style={styles.heroValue}>{formatBRL(data.totals.balance)}</Text>
        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaItem}>
            {data.totals.count} {data.totals.count === 1 ? 'aplicação' : 'aplicações'}
          </Text>
          {data.totals.profit !== 0 ? (
            <Text style={[styles.heroProfit, data.totals.profit < 0 && styles.heroProfitNeg]}>
              {data.totals.profit >= 0 ? '+' : ''}
              {formatBRL(data.totals.profit)} de rentabilidade
            </Text>
          ) : null}
        </View>
      </View>

      {Object.entries(grouped).map(([type, items]) => (
        <View key={type} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.typeDot, { backgroundColor: TYPE_COLOR[type] ?? '#6b7280' }]} />
            <Text style={styles.sectionTitle}>{TYPE_LABEL_PT[type] ?? type}</Text>
            <Text style={styles.sectionCount}>{items.length}</Text>
          </View>
          {items.map((inv) => (
            <InvestmentCard key={inv.id} inv={inv} />
          ))}
        </View>
      ))}

      {data.investments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Nenhum investimento encontrado.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InvestmentCard({ inv }: { inv: InvestmentItem }) {
  const profit = inv.amountProfit ?? 0;
  const original = inv.amountOriginal;
  const profitPct = original && original > 0 ? (profit / original) * 100 : null;

  return (
    <View style={styles.card}>
      <Text style={styles.invName} numberOfLines={2}>
        {inv.name}
      </Text>
      {inv.issuer ? <Text style={styles.invIssuer}>{inv.issuer}</Text> : null}

      <View style={styles.invBalanceRow}>
        <Text style={styles.invBalance}>{formatBRL(inv.balance, inv.currencyCode)}</Text>
        {profit !== 0 ? (
          <Text style={[styles.invProfit, profit < 0 && styles.invProfitNeg]}>
            {profit >= 0 ? '+' : ''}
            {formatBRL(profit, inv.currencyCode)}
            {profitPct != null ? ` (${profitPct.toFixed(2)}%)` : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.metaGrid}>
        {inv.subtype ? <MetaPill label="Subtipo" value={inv.subtype} /> : null}
        {inv.annualRate != null ? (
          <MetaPill label="Rentab. ano" value={`${inv.annualRate.toFixed(2)}%`} highlight />
        ) : null}
        {inv.lastTwelveMonthsRate != null ? (
          <MetaPill label="12 meses" value={`${inv.lastTwelveMonthsRate.toFixed(2)}%`} />
        ) : null}
        {inv.fixedAnnualRate != null ? (
          <MetaPill label="Taxa fixa" value={`${inv.fixedAnnualRate.toFixed(2)}%`} />
        ) : null}
        {inv.dueDate ? (
          <MetaPill
            label="Vencimento"
            value={new Date(inv.dueDate).toLocaleDateString('pt-BR')}
          />
        ) : null}
      </View>
    </View>
  );
}

function MetaPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.pill, highlight && styles.pillHighlight]}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, highlight && styles.pillValueHighlight]}>{value}</Text>
    </View>
  );
}

function groupByType(items: InvestmentItem[]): Record<string, InvestmentItem[]> {
  return items.reduce<Record<string, InvestmentItem[]>>((acc, inv) => {
    (acc[inv.type] ??= []).push(inv);
    return acc;
  }, {});
}

function formatBRL(value: number, currency = 'BRL') {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { paddingVertical: 16, paddingHorizontal: 8, gap: 4 },
  heroLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroValue: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  heroMeta: { gap: 2, marginTop: 4 },
  heroMetaItem: { color: '#6b7280', fontSize: 13 },
  heroProfit: { color: '#34d399', fontSize: 13, fontWeight: '600' },
  heroProfitNeg: { color: '#f87171' },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  sectionCount: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  card: { backgroundColor: '#1f2937', borderRadius: 14, padding: 16, gap: 6 },
  invName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  invIssuer: { color: '#9ca3af', fontSize: 12 },
  invBalanceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 },
  invBalance: { color: '#34d399', fontSize: 22, fontWeight: '800' },
  invProfit: { color: '#34d399', fontSize: 12, fontWeight: '600' },
  invProfitNeg: { color: '#f87171' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: {
    backgroundColor: '#0f1115',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pillHighlight: { borderColor: '#34d39955', backgroundColor: '#022c22' },
  pillLabel: { color: '#6b7280', fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  pillValue: { color: '#e5e7eb', fontSize: 12, fontWeight: '600', marginTop: 2 },
  pillValueHighlight: { color: '#34d399' },
  muted: { color: '#9ca3af', fontSize: 13 },
  error: { color: '#f87171', fontSize: 14 },
});
