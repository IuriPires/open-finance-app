import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type AccountDetail, type TransactionItem } from '../../lib/api';
import { getCategoryMeta } from '../../lib/categories';

export default function AccountDetailScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => api.getAccount(accountId!),
    enabled: !!accountId,
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
          {error instanceof Error ? error.message : 'Erro ao carregar conta'}
        </Text>
      </View>
    );
  }

  const { account, transactions } = data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {account.type === 'CREDIT' && account.creditData ? (
        <CreditCardHero account={account} />
      ) : (
        <BankHero account={account} />
      )}

      {account.type === 'CREDIT' && account.creditData ? (
        <InvoiceCard account={account} />
      ) : null}

      <Section title="Transações recentes">
        {transactions.length === 0 ? (
          <Text style={styles.muted}>Sem transações neste período.</Text>
        ) : (
          transactions.slice(0, 15).map((tx) => (
            <DetailedTxRow key={tx.id} tx={tx} currency={account.currencyCode} />
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function CreditCardHero({ account }: { account: AccountDetail['account'] }) {
  const credit = account.creditData!;
  const limit = credit.creditLimit ?? 0;
  const available = credit.availableCreditLimit ?? 0;
  const used = limit - available;
  const usedPct = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
  const brand = (credit.brand ?? '').toUpperCase();
  const level = credit.level ? credit.level.toUpperCase() : '';

  return (
    <View style={styles.cardHero}>
      <View style={styles.cardGlowTop} />
      <View style={styles.cardGlowBottom} />
      <View style={styles.cardChip} />

      <View style={styles.cardTopRow}>
        <Text style={styles.cardLabel}>{level || 'Cartão'}</Text>
        <Text style={styles.cardBrand}>{brand}</Text>
      </View>

      <Text style={styles.cardNumber}>•••• •••• •••• {account.number}</Text>

      <View style={styles.cardBottomRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardSubLabel}>Titular</Text>
          <Text style={styles.cardHolder} numberOfLines={1}>
            {account.owner ?? 'TITULAR'}
          </Text>
        </View>
        <View>
          <Text style={styles.cardSubLabel}>Vencimento</Text>
          <Text style={styles.cardDate}>
            {credit.balanceDueDate
              ? new Date(credit.balanceDueDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })
              : '--/--'}
          </Text>
        </View>
      </View>

      <View style={styles.limitBlock}>
        <View style={styles.limitRow}>
          <Text style={styles.limitLabel}>Limite usado</Text>
          <Text style={styles.limitValue}>
            {formatBRL(used, account.currencyCode)} / {formatBRL(limit, account.currencyCode)}
          </Text>
        </View>
        <View style={styles.limitTrack}>
          <View style={[styles.limitFill, { width: `${usedPct}%` }]} />
        </View>
        <Text style={styles.limitAvailable}>
          {formatBRL(available, account.currencyCode)} disponível
        </Text>
      </View>
    </View>
  );
}

function InvoiceCard({ account }: { account: AccountDetail['account'] }) {
  const credit = account.creditData!;
  return (
    <View style={styles.invoiceCard}>
      <Text style={styles.sectionTitle}>Fatura atual</Text>
      <View style={styles.invoiceGrid}>
        <InvoiceField
          label="Fechamento"
          value={
            credit.balanceCloseDate
              ? new Date(credit.balanceCloseDate).toLocaleDateString('pt-BR')
              : '—'
          }
        />
        <InvoiceField
          label="Vencimento"
          value={
            credit.balanceDueDate
              ? new Date(credit.balanceDueDate).toLocaleDateString('pt-BR')
              : '—'
          }
        />
        <InvoiceField
          label="Pagamento mínimo"
          value={
            credit.minimumPayment != null
              ? formatBRL(credit.minimumPayment, account.currencyCode)
              : '—'
          }
        />
        <InvoiceField
          label="Status"
          value={credit.status ?? '—'}
          accent={credit.status === 'ACTIVE'}
        />
      </View>
    </View>
  );
}

function InvoiceField({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.invoiceField}>
      <Text style={styles.invoiceLabel}>{label}</Text>
      <Text style={[styles.invoiceValue, accent && styles.invoiceValueAccent]}>{value}</Text>
    </View>
  );
}

function BankHero({ account }: { account: AccountDetail['account'] }) {
  return (
    <View style={styles.bankHero}>
      <Text style={styles.cardSubLabel}>{account.subtype.replace('_', ' ')}</Text>
      <Text style={styles.bankName}>{account.marketingName ?? account.name}</Text>
      <Text style={styles.bankBalance}>{formatBRL(account.balance, account.currencyCode)}</Text>
      <Text style={styles.cardSubLabel}>Conta: {account.number}</Text>
    </View>
  );
}

function DetailedTxRow({ tx, currency }: { tx: TransactionItem; currency: string }) {
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
        <Text style={styles.txMeta}>
          {new Date(tx.date).toLocaleDateString('pt-BR')} · {meta.label}
        </Text>
      </View>
      <Text style={[styles.txAmount, tx.amount < 0 && styles.txAmountNeg]}>
        {formatBRL(tx.amount, currency)}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
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
  cardHero: {
    borderRadius: 18,
    padding: 22,
    gap: 18,
    minHeight: 220,
    overflow: 'hidden',
    backgroundColor: '#0c0c1f',
  },
  cardGlowTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#5b21b6',
    opacity: 0.5,
  },
  cardGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: '#1e3a8a',
    opacity: 0.4,
  },
  cardChip: {
    position: 'absolute',
    top: 70,
    left: 22,
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#facc15',
    opacity: 0.85,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, opacity: 0.7 },
  cardBrand: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  cardNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Menlo',
    letterSpacing: 2,
    marginTop: 30,
  },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardSubLabel: { color: '#fff', fontSize: 9, fontWeight: '600', letterSpacing: 1, opacity: 0.6, textTransform: 'uppercase' },
  cardHolder: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  cardDate: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2, fontFamily: 'Menlo' },
  limitBlock: { gap: 6, marginTop: 4 },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  limitLabel: { color: '#fff', fontSize: 11, opacity: 0.7 },
  limitValue: { color: '#fff', fontSize: 11, fontWeight: '600' },
  limitTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 3, overflow: 'hidden' },
  limitFill: { height: '100%', backgroundColor: '#34d399', borderRadius: 3 },
  limitAvailable: { color: '#34d399', fontSize: 11, fontWeight: '600', marginTop: 2 },
  invoiceCard: { backgroundColor: '#1f2937', borderRadius: 14, padding: 16, gap: 12 },
  invoiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  invoiceField: { flexBasis: '45%', gap: 4 },
  invoiceLabel: { color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  invoiceValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  invoiceValueAccent: { color: '#34d399' },
  bankHero: { backgroundColor: '#1f2937', borderRadius: 14, padding: 20, gap: 4 },
  bankName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bankBalance: { color: '#34d399', fontSize: 28, fontWeight: '800', marginVertical: 8 },
  section: { gap: 8 },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, gap: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  txIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: '#e5e7eb', fontSize: 13 },
  txMeta: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  txAmount: { color: '#34d399', fontSize: 13, fontWeight: '600' },
  txAmountNeg: { color: '#f87171' },
  muted: { color: '#9ca3af', fontSize: 13 },
  error: { color: '#f87171', fontSize: 14 },
});
