import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';

const TERMINAL = new Set([
  'PAYMENT_COMPLETED',
  'PAYMENT_REJECTED',
  'ERROR',
  'CANCELED',
  'CONSENT_REJECTED',
  'EXPIRED',
]);

export default function PaymentStatusScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment-intent', requestId],
    queryFn: () => api.paymentIntent(requestId!),
    enabled: !!requestId,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d || !d.found) return 2500;
      return TERMINAL.has(d.intent.status) ? false : 2500;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
        <Text style={styles.muted}>Carregando…</Text>
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
  if (!data || !data.found) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" />
        <Text style={styles.muted}>Aguardando confirmação do banco-pagador…</Text>
      </View>
    );
  }

  const { intent } = data;
  const completed = intent.status === 'PAYMENT_COMPLETED';
  const failed = TERMINAL.has(intent.status) && !completed;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, completed && styles.badgeOk, failed && styles.badgeFail]}>
        <Text style={styles.badgeLabel}>{intent.status}</Text>
      </View>

      <Text style={styles.title}>
        {completed ? 'Pagamento concluído' : failed ? 'Pagamento não concluído' : 'Em andamento'}
      </Text>

      {intent.connector ? (
        <Text style={styles.muted}>Banco: {intent.connector.name}</Text>
      ) : null}

      <Text style={styles.muted}>Intent ID: {intent.id}</Text>
      <Text style={styles.muted}>
        Atualizado em {new Date(intent.updatedAt).toLocaleString('pt-BR')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    marginBottom: 12,
  },
  badgeOk: { backgroundColor: '#065f46' },
  badgeFail: { backgroundColor: '#7f1d1d' },
  badgeLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  muted: { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
  error: { color: '#f87171', fontSize: 14 },
});
