import { config } from './config';

// Cliente da API de Orgs da Snabber (documentação em <snabber>/developers/org, para orgs ativas).
// Dois tipos de chave: a da org (gerencia clientes) e a de cada cliente (conecta e lê dados).
// Toda chamada sai do servidor do ERP — as chaves nunca vão para o navegador.

export class SnabberError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
}

async function call<T>(path: string, key: string, opts: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== '') qs.set(k, v);
  const url = `${config.snabberBaseUrl}${path}${qs.size ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: 'no-store',
  });
  if (res.status === 204) return null as T;
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    throw new SnabberError(res.status, json?.error?.code ?? `HTTP_${res.status}`, json?.error?.message ?? res.statusText, json?.error);
  }
  return json as T;
}

export interface OrgClient {
  client_id: number;
  external_id: string;
  name: string;
  sandbox: boolean;
  max_connections: number | null;
  connections_used: number;
  key_prefix: string | null;
  key_last_used_at: string | null;
  created_at: string;
}

export interface Connection {
  connection_id: number;
  institution: string | null;
  status: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  date: string;
  description: string | null;
  amount: number | null;
  type: 'income' | 'expense';
  category: string | null;
  category_parent: string | null;
  account: string | null;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string | null;
  type: string | null;
  balance: number | null;
  currency_code: string;
  institution: { name: string | null; logo_url: string | null } | null;
  is_connected: boolean;
}

// ── Chave da org ────────────────────────────────────────────────────────────

export const orgApi = {
  listClients: () => call<{ data: OrgClient[] }>('/api/v1/org/clients', config.orgKey, { query: { limit: '200' } }),
  createClient: (body: { external_id: string; name: string; cnpj?: string; sandbox?: boolean; max_connections?: number | null; scopes?: string[] }) =>
    call<OrgClient & { workspace_id: number; api_key: string }>('/api/v1/org/clients', config.orgKey, { method: 'POST', body }),
  updateClient: (id: number, body: { name?: string; max_connections?: number | null }) =>
    call<OrgClient>(`/api/v1/org/clients/${id}`, config.orgKey, { method: 'PATCH', body }),
  rotateKey: (id: number) => call<{ api_key: string; key_prefix: string }>(`/api/v1/org/clients/${id}/rotate-key`, config.orgKey, { method: 'POST' }),
  deleteClient: (id: number) => call<null>(`/api/v1/org/clients/${id}`, config.orgKey, { method: 'DELETE' }),
};

// ── Chave do cliente ────────────────────────────────────────────────────────

export const clientApi = {
  createSession: (key: string, body: { redirect_url: string; connection_id?: number }) =>
    call<{ url: string; expires_at: string }>('/api/v1/connect-sessions', key, { method: 'POST', body }),
  listConnections: (key: string) => call<{ data: Connection[] }>('/api/v1/connections', key),
  deleteConnection: (key: string, id: number, deleteData: boolean) =>
    call<{ deleted_counts: Record<string, number>; pluggy_api_error: string | null }>(`/api/v1/connections/${id}`, key, {
      method: 'DELETE',
      query: { delete_data: deleteData ? 'true' : 'false' },
    }),
  listTransactions: (key: string, opts: { updatedSince?: string; limit?: number } = {}) =>
    call<{ data: Transaction[]; pagination: { has_more: boolean; next_cursor: string | null } }>('/api/v1/transactions', key, {
      query: { updated_since: opts.updatedSince, limit: String(opts.limit ?? 50), include_ignorable_categories: 'true' },
    }),
  listAccounts: (key: string) => call<{ data: Account[] }>('/api/v1/accounts', key),
};
