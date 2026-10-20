'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { decryptSecret, encryptSecret } from './crypto';
import { SnabberError, clientApi, orgApi } from './snabber';
import { getCustomer, mutate, newCustomerId } from './store';

// Ações do servidor do ERP de demo. Cada uma chama a API da Snabber com a chave certa (da org ou
// do cliente) e devolve o erro em ?erro= para a tela mostrar.

function errorParam(err: unknown): string {
  if (err instanceof SnabberError) return encodeURIComponent(`${err.code}: ${err.message}`);
  return encodeURIComponent(err instanceof Error ? err.message : String(err));
}

export async function createCustomerAction(form: FormData) {
  const name = String(form.get('name') ?? '').trim();
  const document = String(form.get('document') ?? '').trim() || null;
  const sandbox = form.get('sandbox') === 'on';
  const maxRaw = String(form.get('max_connections') ?? '').trim();
  const maxConnections = maxRaw === '' ? null : Number(maxRaw);
  const id = newCustomerId();

  let created: Awaited<ReturnType<typeof orgApi.createClient>>;
  try {
    created = await orgApi.createClient({
      external_id: id,
      name,
      ...(document ? { cnpj: document } : {}),
      sandbox,
      max_connections: maxConnections,
      // Este ERP também remove conexões, então pede o escopo delete além do padrão.
      scopes: ['read', 'write', 'delete'],
    });
  } catch (err) {
    redirect(`/clientes/novo?erro=${errorParam(err)}`);
  }

  await mutate((db) => {
    db.customers.unshift({
      id,
      name,
      document,
      sandbox,
      maxConnections,
      snabberClientId: created.client_id,
      apiKeyEnc: encryptSecret(created.api_key),
      apiKeyPrefix: created.key_prefix,
      createdAt: new Date().toISOString(),
      lastWebhookAt: null,
      lastSyncAt: null,
      pendingNewTransactions: false,
    });
  });
  redirect(`/clientes/${id}?ok=${encodeURIComponent('Cliente criado na Snabber.')}`);
}

export async function updateLimitAction(form: FormData) {
  const id = String(form.get('id'));
  const customer = await getCustomer(id);
  if (!customer) redirect('/');
  const raw = String(form.get('max_connections') ?? '').trim();
  const maxConnections = raw === '' ? null : Number(raw);
  try {
    await orgApi.updateClient(customer.snabberClientId, { max_connections: maxConnections });
    await mutate((db) => {
      const c = db.customers.find((x) => x.id === id);
      if (c) c.maxConnections = maxConnections;
    });
  } catch (err) {
    redirect(`/clientes/${id}?erro=${errorParam(err)}`);
  }
  redirect(`/clientes/${id}?ok=${encodeURIComponent('Limite atualizado.')}`);
}

export async function rotateKeyAction(form: FormData) {
  const id = String(form.get('id'));
  const customer = await getCustomer(id);
  if (!customer) redirect('/');
  try {
    const rotated = await orgApi.rotateKey(customer.snabberClientId);
    await mutate((db) => {
      const c = db.customers.find((x) => x.id === id);
      if (c) {
        c.apiKeyEnc = encryptSecret(rotated.api_key);
        c.apiKeyPrefix = rotated.key_prefix;
      }
    });
  } catch (err) {
    redirect(`/clientes/${id}?erro=${errorParam(err)}`);
  }
  redirect(`/clientes/${id}?ok=${encodeURIComponent('Chave do cliente trocada. A antiga já não funciona.')}`);
}

export async function deleteConnectionAction(form: FormData) {
  const id = String(form.get('id'));
  const connectionId = Number(form.get('connection_id'));
  const deleteData = form.get('delete_data') === 'on';
  const customer = await getCustomer(id);
  if (!customer) redirect('/');
  let msg = '';
  try {
    const res = await clientApi.deleteConnection(decryptSecret(customer.apiKeyEnc), connectionId, deleteData);
    msg = res.pluggy_api_error ? `Conexão removida (aviso da Pluggy: ${res.pluggy_api_error}).` : 'Conexão removida.';
  } catch (err) {
    redirect(`/clientes/${id}?erro=${errorParam(err)}`);
  }
  redirect(`/clientes/${id}?ok=${encodeURIComponent(msg)}`);
}

/** Busca só o que mudou desde a última busca (updated_since) e marca as novidades como lidas. */
export async function syncAction(form: FormData) {
  const id = String(form.get('id'));
  const customer = await getCustomer(id);
  if (!customer) redirect('/');
  const startedAt = new Date().toISOString();
  let count = 0;
  try {
    const res = await clientApi.listTransactions(decryptSecret(customer.apiKeyEnc), {
      updatedSince: customer.lastSyncAt ?? undefined,
      limit: 200,
    });
    count = res.data.length;
    await mutate((db) => {
      const c = db.customers.find((x) => x.id === id);
      if (c) {
        c.lastSyncAt = startedAt;
        c.pendingNewTransactions = false;
      }
    });
  } catch (err) {
    redirect(`/clientes/${id}?erro=${errorParam(err)}`);
  }
  redirect(`/clientes/${id}?ok=${encodeURIComponent(`${count} transação(ões) nova(s) ou alterada(s) desde a última busca.`)}`);
}

export async function deleteCustomerAction(form: FormData) {
  const id = String(form.get('id'));
  const customer = await getCustomer(id);
  if (!customer) redirect('/');
  try {
    await orgApi.deleteClient(customer.snabberClientId);
  } catch (err) {
    if (!(err instanceof SnabberError && err.status === 404)) redirect(`/clientes/${id}?erro=${errorParam(err)}`);
  }
  await mutate((db) => {
    db.customers = db.customers.filter((c) => c.id !== id);
  });
  revalidatePath('/');
  redirect(`/?ok=${encodeURIComponent(`Cliente ${customer.name} removido (na Snabber também).`)}`);
}

export async function clearWebhooksAction() {
  await mutate((db) => {
    db.webhooks = [];
  });
  redirect('/webhooks');
}
