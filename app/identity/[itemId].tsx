import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';

export default function IdentityScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['identity', itemId],
    queryFn: () => api.getIdentity(itemId!),
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
          {error instanceof Error ? error.message : 'Erro ao carregar identidade'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Titular</Text>
        <Text style={styles.heroName}>{data.fullName ?? '—'}</Text>
        {data.jobTitle ? <Text style={styles.heroSubtitle}>{data.jobTitle}</Text> : null}
      </View>

      <Section title="Documento">
        <Field label={data.documentType ?? 'Documento'} value={data.document} mono />
        <Field
          label="Nascimento"
          value={data.birthDate ? new Date(data.birthDate).toLocaleDateString('pt-BR') : null}
        />
      </Section>

      {data.emails.length > 0 ? (
        <Section title="E-mails">
          {data.emails.map((e, i) => (
            <Field key={`${e.value}-${i}`} label={e.type ?? 'E-mail'} value={e.value} />
          ))}
        </Section>
      ) : null}

      {data.phones.length > 0 ? (
        <Section title="Telefones">
          {data.phones.map((p, i) => (
            <Field key={`${p.value}-${i}`} label={p.type ?? 'Telefone'} value={p.value} mono />
          ))}
        </Section>
      ) : null}

      {data.addresses.length > 0 ? (
        <Section title="Endereços">
          {data.addresses.map((a, i) => (
            <View key={i} style={styles.addressBlock}>
              <Text style={styles.addressType}>{a.type ?? 'Endereço'}</Text>
              {a.fullAddress ? <Text style={styles.addressLine}>{a.fullAddress}</Text> : null}
              <Text style={styles.addressMeta}>
                {[a.city, a.state, a.postalCode, a.country].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}
    </ScrollView>
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

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.mono]}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heroCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  heroLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '700' },
  heroSubtitle: { color: '#a78bfa', fontSize: 13, marginTop: 4 },
  section: { gap: 8 },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, gap: 12 },
  field: { gap: 2 },
  fieldLabel: { color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { color: '#fff', fontSize: 15 },
  mono: { fontFamily: 'Menlo' },
  addressBlock: { gap: 4 },
  addressType: { color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressLine: { color: '#fff', fontSize: 14 },
  addressMeta: { color: '#9ca3af', fontSize: 12 },
  error: { color: '#f87171', fontSize: 14, textAlign: 'center' },
});
