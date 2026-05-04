import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type Favorite } from '../lib/api';

export default function FavoritesScreen() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.listFavorites(),
  });

  const add = useMutation({
    mutationFn: api.addFavorite,
    onSuccess: () => {
      setLabel('');
      setAmount('');
      setDescription('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erro ao salvar'),
  });

  const remove = useMutation({
    mutationFn: api.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const submit = () => {
    setError(null);
    const num = Number(amount.replace(',', '.'));
    if (!label.trim() || !Number.isFinite(num) || num <= 0) {
      setError('Preencha rótulo e valor');
      return;
    }
    add.mutate({ label: label.trim(), amount: num, description });
  };

  const confirmRemove = (fav: Favorite) => {
    Alert.alert('Remover favorito', `Excluir "${fav.label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(fav.id) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Novo favorito</Text>
        <TextInput
          style={styles.input}
          placeholder="Rótulo (ex: Aluguel)"
          placeholderTextColor="#6b7280"
          value={label}
          onChangeText={setLabel}
        />
        <TextInput
          style={styles.input}
          placeholder="Valor (R$)"
          placeholderTextColor="#6b7280"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Descrição (opcional)"
          placeholderTextColor="#6b7280"
          value={description}
          onChangeText={setDescription}
        />
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={submit}
          disabled={add.isPending}
        >
          <Text style={styles.ctaLabel}>
            {add.isPending ? 'Salvando…' : 'Salvar favorito'}
          </Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
      ) : (
        <FlatList<Favorite>
          data={data?.favorites ?? []}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.muted}>Nenhum favorito salvo ainda.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowAmount}>{formatBRL(item.amount)}</Text>
                {item.description ? (
                  <Text style={styles.rowDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => confirmRemove(item)}
                style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
              >
                <Ionicons name="trash-outline" size={18} color="#f87171" />
              </Pressable>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
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
  screen: { flex: 1, padding: 16, gap: 16, backgroundColor: '#0f1115' },
  formCard: { backgroundColor: '#1f2937', borderRadius: 14, padding: 16, gap: 10 },
  formTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  input: {
    backgroundColor: '#0f1115',
    color: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cta: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  ctaLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  error: { color: '#f87171', fontSize: 12, marginTop: 4 },
  list: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rowAmount: { color: '#34d399', fontSize: 14, fontWeight: '700', marginTop: 2 },
  rowDesc: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  removeBtn: { padding: 8, borderRadius: 8, backgroundColor: '#7f1d1d22' },
  muted: { color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 24 },
});
