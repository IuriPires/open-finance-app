import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { api, type Favorite } from '../../lib/api';

export default function NewPaymentScreen() {
  const router = useRouter();
  const [amountText, setAmountText] = useState('1.00');
  const [description, setDescription] = useState('Pluggy POC PIX');
  const [activeFavoriteId, setActiveFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.listFavorites(),
  });

  const favorites = favoritesData?.favorites ?? [];

  const applyFavorite = (fav: Favorite) => {
    if (activeFavoriteId === fav.id) {
      setActiveFavoriteId(null);
      return;
    }
    setActiveFavoriteId(fav.id);
    setAmountText(fav.amount.toFixed(2));
    setDescription(fav.description || fav.label);
  };

  const submit = async () => {
    setError(null);
    const amount = Number(amountText.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Valor inválido');
      return;
    }

    setLoading(true);
    try {
      const { paymentRequestId, paymentUrl } = await api.createPayment({
        amount,
        description,
      });

      await WebBrowser.openBrowserAsync(paymentUrl, { dismissButtonStyle: 'done' });

      router.replace(`/payment/${paymentRequestId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {favorites.length > 0 ? (
        <View style={styles.favSection}>
          <View style={styles.favHeader}>
            <Text style={styles.label}>Favoritos</Text>
            <Pressable
              onPress={() => router.push('/favorites')}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.manageLink}>Gerenciar</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favRow}
          >
            {favorites.map((fav) => (
              <Pressable
                key={fav.id}
                onPress={() => applyFavorite(fav)}
                style={({ pressed }) => [
                  styles.favChip,
                  activeFavoriteId === fav.id && styles.favChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.favChipLabel,
                    activeFavoriteId === fav.id && styles.favChipLabelActive,
                  ]}
                >
                  {fav.label}
                </Text>
                <Text
                  style={[
                    styles.favChipAmount,
                    activeFavoriteId === fav.id && styles.favChipAmountActive,
                  ]}
                >
                  {formatBRL(fav.amount)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push('/favorites')}
          style={({ pressed }) => [styles.addFavCta, pressed && styles.pressed]}
        >
          <Ionicons name="bookmark-outline" size={16} color="#a78bfa" />
          <Text style={styles.addFavLabel}>Cadastrar pagamentos favoritos</Text>
        </Pressable>
      )}

      <Text style={styles.label}>Valor (BRL)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amountText}
        onChangeText={(v) => {
          setAmountText(v);
          setActiveFavoriteId(null);
        }}
        placeholder="1.00"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={(v) => {
          setDescription(v);
          setActiveFavoriteId(null);
        }}
        placeholder="Pluggy POC PIX"
        placeholderTextColor="#6b7280"
      />

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={styles.ctaLabel}>{loading ? 'Criando…' : 'Iniciar pagamento'}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.hint}>
        Ao tocar em "Iniciar pagamento" você será redirecionado para a página da Pluggy
        (sandbox) para escolher o banco e autorizar a transação. Os favoritos pré-preenchem
        valor e descrição — o destinatário PIX é informado na página da Pluggy.
      </Text>
    </ScrollView>
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
  container: { padding: 24, gap: 12, paddingBottom: 32 },
  favSection: { gap: 8, marginBottom: 8 },
  favHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  favRow: { gap: 8, paddingRight: 8 },
  favChip: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 120,
  },
  favChipActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a8a55' },
  favChipLabel: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  favChipLabelActive: { color: '#fff' },
  favChipAmount: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginTop: 4 },
  favChipAmountActive: { color: '#60a5fa' },
  addFavCta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addFavLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  label: { color: '#9ca3af', fontSize: 13, marginTop: 8 },
  input: {
    backgroundColor: '#1f2937',
    color: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 16,
  },
  cta: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  ctaLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  error: { color: '#f87171', fontSize: 13 },
  hint: { color: '#6b7280', fontSize: 12, lineHeight: 18, marginTop: 16 },
});
