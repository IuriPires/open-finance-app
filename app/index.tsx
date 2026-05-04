import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { PluggyConnect } from 'react-native-pluggy-connect';
import { api, type ItemSummary } from '../lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.listItems(),
    refetchInterval: (q) => {
      const items = q.state.data?.items ?? [];
      return items.some((i) => i.status === 'UPDATING') ? 3000 : false;
    },
  });

  const items = itemsData?.items ?? [];
  const totalBalance = items.reduce((sum, i) => sum + i.totalBalance, 0);
  const totalInvested = items.reduce((sum, i) => sum + i.totalInvested, 0);
  const totalNet = totalBalance + totalInvested;

  const startConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api.connectToken();
      setConnectToken(accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao obter token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Patrimônio total</Text>
          <Text style={styles.heroValue}>{formatBRL(totalNet)}</Text>
          {items.length > 0 ? (
            <View style={styles.heroBreakdown}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipLabel}>Em conta</Text>
                <Text style={styles.heroChipValue}>{formatBRL(totalBalance)}</Text>
              </View>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipLabel}>Investido</Text>
                <Text style={[styles.heroChipValue, styles.heroChipValuePurple]}>
                  {formatBRL(totalInvested)}
                </Text>
              </View>
            </View>
          ) : null}
          <Text style={styles.heroMeta}>
            {items.length === 0
              ? 'Nenhuma conta conectada'
              : `${items.length} ${items.length === 1 ? 'instituição conectada' : 'instituições conectadas'}`}
          </Text>
        </View>

        {itemsLoading ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Comece conectando uma conta</Text>
            <Text style={styles.emptySubtitle}>
              Use o sandbox da Pluggy: usuário <Text style={styles.mono}>user-ok</Text>, senha{' '}
              <Text style={styles.mono}>password-ok</Text>, MFA <Text style={styles.mono}>123456</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => (
              <ItemCard
                key={item.itemId}
                item={item}
                onPress={() => router.push(`/accounts/${item.itemId}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.ctas}>
        <Pressable
          style={({ pressed }) => [styles.cta, styles.ctaPrimary, pressed && styles.pressed]}
          onPress={startConnect}
          disabled={loading}
        >
          <Text style={styles.ctaLabel}>
            {loading ? 'Carregando…' : items.length === 0 ? 'Conectar conta' : 'Conectar mais uma'}
          </Text>
        </Pressable>

        {items.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.cta, styles.ctaSecondary, pressed && styles.pressed]}
            onPress={() => router.push('/payment/new')}
          >
            <Text style={styles.ctaLabel}>Iniciar PIX</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal
        visible={!!connectToken}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setConnectToken(null)}
      >
        {connectToken ? (
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox
            onSuccess={async ({ item }) => {
              setConnectToken(null);
              try {
                await api.addItem(item.id);
                await queryClient.invalidateQueries({ queryKey: ['items'] });
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Falha ao registrar item');
              }
              router.push(`/accounts/${item.id}`);
            }}
            onError={(err) => {
              setConnectToken(null);
              setError(err.message ?? 'Erro no widget');
            }}
            onClose={() => setConnectToken(null)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function ItemCard({ item, onPress }: { item: ItemSummary; onPress: () => void }) {
  const accent = `#${item.connector.primaryColor}`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}
    >
      <View style={[styles.itemAccent, { backgroundColor: accent }]} />
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Image
            source={{ uri: item.connector.imageUrl }}
            style={styles.itemLogo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.connector.name}</Text>
            <Text style={styles.itemMeta}>
              {item.accountsCount} {item.accountsCount === 1 ? 'conta' : 'contas'}
              {item.status !== 'UPDATED' ? ` · ${item.status}` : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.itemBalance}>{formatBRL(item.totalBalance)}</Text>
      </View>
    </Pressable>
  );
}

function formatBRL(value: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1115' },
  scroll: { padding: 16, paddingBottom: 24 },
  hero: { paddingVertical: 24, paddingHorizontal: 8, gap: 4 },
  heroLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroValue: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  heroMeta: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  heroBreakdown: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  heroChip: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  heroChipLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroChipValue: { color: '#34d399', fontSize: 16, fontWeight: '700' },
  heroChipValuePurple: { color: '#a78bfa' },
  emptyState: { padding: 24, gap: 8, alignItems: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { color: '#9ca3af', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  mono: { fontFamily: 'Menlo', color: '#a78bfa' },
  itemsList: { gap: 12 },
  itemCard: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  itemAccent: { width: 4 },
  itemBody: { flex: 1, padding: 16, gap: 8 },
  itemHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  itemLogo: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#0f1115' },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  itemBalance: { color: '#34d399', fontSize: 22, fontWeight: '700', marginTop: 4 },
  ctas: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  cta: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  ctaPrimary: { backgroundColor: '#3b82f6' },
  ctaSecondary: { backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
  ctaLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  errorBanner: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#fee2e2', fontSize: 13 },
});
