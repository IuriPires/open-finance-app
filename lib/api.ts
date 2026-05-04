const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export type ConnectTokenResponse = { accessToken: string };

export type AccountSnapshot = {
  account: {
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    balance: number;
    currencyCode: string;
  };
  transactions: TransactionItem[];
};

export type TransactionItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  categoryId: string | null;
  type?: string;
};

export type ItemSnapshotResponse =
  | { state: 'syncing'; item: { id: string; status: string } }
  | { state: 'error'; item: { id: string; status: string; error?: unknown } }
  | {
      state: 'ready';
      item: { id: string; status: string; connector: { name: string } };
      accounts: AccountSnapshot[];
    };

export type AccountDetail = {
  account: {
    id: string;
    itemId: string;
    type: 'BANK' | 'CREDIT';
    subtype: string;
    name: string;
    marketingName: string | null;
    number: string;
    balance: number;
    currencyCode: string;
    owner: string | null;
    taxNumber: string | null;
    bankData: {
      transferNumber: string | null;
      closingBalance: number | null;
      automaticallyInvestedBalance: number | null;
      overdraftUsedLimit: number | null;
      unarrangedOverdraftAmount: number | null;
    } | null;
    creditData: {
      level: string | null;
      brand: string | null;
      balanceCloseDate: string | null;
      balanceDueDate: string | null;
      availableCreditLimit: number | null;
      creditLimit: number | null;
      minimumPayment: number | null;
      isLimitFlexible: boolean | null;
      status: string | null;
      holderType: string | null;
    } | null;
  };
  transactions: TransactionItem[];
};

export type ItemSummary = {
  itemId: string;
  connector: { id: number; name: string; imageUrl: string; primaryColor: string };
  accountsCount: number;
  totalBalance: number;
  totalInvested: number;
  status: string;
};

export type InvestmentItem = {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number;
  amount: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  currencyCode: string;
  issuer: string | null;
  dueDate: string | null;
  rate: number | null;
  rateType: string | null;
  fixedAnnualRate: number | null;
  annualRate: number | null;
  lastTwelveMonthsRate: number | null;
  status: string | null;
};

export type InvestmentsResponse = {
  investments: InvestmentItem[];
  totals: { balance: number; profit: number; count: number };
};

export type CategoryAggregate = {
  prefix: string;
  total: number;
  count: number;
  previousTotal: number;
  deltaPct: number | null;
};

export type InsightsResponse = {
  month: string;
  previousMonth: string;
  totalSpent: number;
  previousTotalSpent: number;
  categories: CategoryAggregate[];
};

export type Favorite = {
  id: string;
  label: string;
  amount: number;
  description: string;
  createdAt: string;
};

export type IdentitySummary = {
  fullName: string | null;
  document: string | null;
  documentType: string | null;
  birthDate: string | null;
  jobTitle: string | null;
  emails: Array<{ value: string; type: string | null }>;
  phones: Array<{ value: string; type: string | null }>;
  addresses: Array<{
    fullAddress: string | null;
    primaryAddress: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    type: string | null;
  }>;
};

export type CreatePaymentResponse = {
  paymentRequestId: string;
  paymentUrl: string;
  status: string;
};

export type PaymentIntentResponse =
  | { found: false; message: string }
  | {
      found: true;
      intent: {
        id: string;
        status: string;
        connector: { name: string } | null;
        createdAt: string;
        updatedAt: string;
      };
    };

export const api = {
  connectToken: () => http<ConnectTokenResponse>('/api/connect-token', { method: 'POST' }),
  listItems: () => http<{ items: ItemSummary[] }>('/api/items'),
  addItem: (itemId: string) =>
    http<{ ok: true; items: string[] }>('/api/items', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),
  itemSnapshot: (id: string) => http<ItemSnapshotResponse>(`/api/items/${id}/snapshot`),
  getAccount: (id: string) => http<AccountDetail>(`/api/accounts/${id}`),
  getIdentity: (id: string) => http<IdentitySummary>(`/api/items/${id}/identity`),
  getInvestments: (id: string) => http<InvestmentsResponse>(`/api/items/${id}/investments`),
  getInsights: (id: string, month?: string) =>
    http<InsightsResponse>(
      `/api/items/${id}/insights${month ? `?month=${month}` : ''}`,
    ),
  listFavorites: () => http<{ favorites: Favorite[] }>('/api/favorites'),
  addFavorite: (body: { label: string; amount: number; description?: string }) =>
    http<{ favorite: Favorite }>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeFavorite: (id: string) =>
    http<{ ok: true }>(`/api/favorites/${id}`, { method: 'DELETE' }),
  createPayment: (body: { amount: number; description?: string }) =>
    http<CreatePaymentResponse>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  paymentIntent: (requestId: string) =>
    http<PaymentIntentResponse>(`/api/payments/${requestId}/intent`),
};
