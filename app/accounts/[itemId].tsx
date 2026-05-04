import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type AccountSnapshot, type TransactionItem } from '../../lib/api';
import {
  categoryMatchesPrefix,
  getCategoryMeta,
  getTopLevelCategories,
} from '../../lib/categories';

export default function AccountsScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();
  const [filterPrefix, setFilterPrefix] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['snapshot', itemId],
    queryFn: () => api.itemSnapshot(itemId!),
    enabled: !!itemId,
    refetchInterval: (q) => {
      const s = q.state.data?.state;
      if (s === 'ready' || s === 'error') return false;
      return 2500;
    },
  });

  const presentPrefixes = useMemo(() => {
    if (!data || data.state !== 'ready') return new Set<string>();
    const set = new Set<string>();
    for (const a of data.accounts) {
      for (const tx of a.transactions) {
        if (tx.categoryId) set.add(tx.categoryId.slice(0, 2));
      }
    }
    return set;
  }, [data]);

  if (isLoading || data?.state === 'syncing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
        <Text style={styles.muted}>
          Sincronizando dados{data ? ` (${data.item.status})` : ''}…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(error as Error).message}</Text>
      </View>
    );
  }

  if (!data || data.state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Sincronização falhou{data ? `: ${data.item.status}` : ''}
        </Text>
      </View>
    );
  }

  const filteredAccounts = filterPrefix
    ? data.accounts.map((a) => ({
        ...a,
        transactions: a.transactions.filter((tx) =>
          categoryMatchesPrefix(tx.categoryId, filterPrefix),
        ),
      }))
    : data.accounts;

  return (
    <FlatList<AccountSnapshot>
      data={filteredAccounts}
      keyExtractor={(a) => a.account.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.bankName}>{data.item.connector.name}</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push(`/identity/${itemId}`)}
              style={({ pressed }) => [styles.headerCta, pressed && styles.pressed]}
            >
              <Text style={styles.headerCtaLabel}>Perfil</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/investments/${itemId}`)}
              style={({ pressed }) => [styles.headerCta, pressed && styles.pressed]}
            >
              <Text style={styles.headerCtaLabel}>Investimentos</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/insights/${itemId}`)}
              style={({ pressed }) => [styles.headerCta, pressed && styles.pressed]}
            >
              <Text style={styles.headerCtaLabel}>Insights</Text>
            </Pressable>
          </View>

          {presentPrefixes.size > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterChip
                label="Todas"
                color="#9ca3af"
                active={filterPrefix === null}
                onPress={() => setFilterPrefix(null)}
              />
              {getTopLevelCategories()
                .filter((c) => presentPrefixes.has(c.prefix))
                .map((cat) => (
                  <FilterChip
                    key={cat.prefix}
                    label={cat.label}
                    icon={cat.icon}
                    color={cat.color}
                    active={filterPrefix === cat.prefix}
                    onPress={() =>
                      setFilterPrefix(filterPrefix === cat.prefix ? null : cat.prefix)
                    }
                  />
                ))}
            </ScrollView>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/account/${item.account.id}`)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <AccountCard snapshot={item} />
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

function FilterChip({
  label,
  icon,
  color,
  active,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && { backgroundColor: `${color}22`, borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? color : '#9ca3af'} /> : null}
      <Text style={[styles.filterChipLabel, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

function AccountCard({ snapshot }: { snapshot: AccountSnapshot }) {
  const { account, transactions } = snapshot;
  return (
    <View style={styles.card}>
      <Text style={styles.accountName}>{account.name}</Text>
      <Text style={styles.accountType}>
        {account.type} · {account.subtype ?? '—'}
      </Text>
      <Text style={styles.balance}>{formatBRL(account.balance, account.currencyCode)}</Text>

      <Text style={styles.txHeader}>
        Transações ({transactions.length})
      </Text>
      {transactions.slice(0, 8).map((tx) => (
        <TransactionRow key={tx.id} tx={tx} currency={account.currencyCode} />
      ))}
      {transactions.length === 0 ? (
        <Text style={styles.muted}>Sem transações nesta categoria.</Text>
      ) : null}
    </View>
  );
}

export function TransactionRow({
  tx,
  currency,
}: {
  tx: TransactionItem;
  currency: string;
}) {
  const meta = getCategoryMeta(tx.categoryId);
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: `${meta.color}22` }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txDesc} numberOfLines={1}>
          {tx.description}
        </Text>
        <Text style={styles.txDate}>
          {new Date(tx.date).toLocaleDateString('pt-BR')} · {meta.label}
        </Text>
      </View>
      <Text style={[styles.txAmount, tx.amount < 0 && styles.txAmountNeg]}>
        {formatBRL(tx.amount, currency)}
      </Text>
    </View>
  );
}

function formatBRL(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  header: { gap: 12, marginBottom: 8 },
  bankName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerCta: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerCtaLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  filterRow: { gap: 8, paddingVertical: 4, paddingRight: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterChipLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, gap: 4 },
  sep: { height: 12 },
  accountName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  accountType: { color: '#9ca3af', fontSize: 12, textTransform: 'uppercase' },
  balance: { color: '#34d399', fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  txHeader: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: { color: '#e5e7eb', fontSize: 13 },
  txDate: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  txAmount: { color: '#34d399', fontSize: 13, fontWeight: '600' },
  txAmountNeg: { color: '#f87171' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  muted: { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
  error: { color: '#f87171', fontSize: 14 },
});
