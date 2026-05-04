import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f1115' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#0f1115' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Pluggy POC' }} />
        <Stack.Screen name="accounts/[itemId]" options={{ title: 'Contas' }} />
        <Stack.Screen name="account/[accountId]" options={{ title: 'Detalhe' }} />
        <Stack.Screen name="identity/[itemId]" options={{ title: 'Perfil do titular' }} />
        <Stack.Screen name="investments/[itemId]" options={{ title: 'Investimentos' }} />
        <Stack.Screen name="insights/[itemId]" options={{ title: 'Insights' }} />
        <Stack.Screen name="payment/new" options={{ title: 'Novo PIX' }} />
        <Stack.Screen name="payment/[requestId]" options={{ title: 'Status do PIX' }} />
      </Stack>
    </QueryClientProvider>
  );
}
