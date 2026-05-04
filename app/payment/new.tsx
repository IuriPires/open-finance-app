import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../lib/api';

export default function NewPaymentScreen() {
  const router = useRouter();
  const [amountText, setAmountText] = useState('1.00');
  const [description, setDescription] = useState('Pluggy POC PIX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <View style={styles.container}>
      <Text style={styles.label}>Valor (BRL)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amountText}
        onChangeText={setAmountText}
        placeholder="1.00"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
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
        (sandbox) para escolher o banco e autorizar a transação.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
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
