import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// "Banco" do ERP de demo: um JSON em .data/db.json (fora do git). Suficiente para uma pessoa
// testando; um ERP de verdade usaria o próprio banco.

export interface Customer {
  /** Id do cliente no ERP — vai como external_id para a Snabber. */
  id: string;
  name: string;
  document: string | null;
  sandbox: boolean;
  maxConnections: number | null;
  /** client_id na Snabber. */
  snabberClientId: number;
  /** Chave de API do cliente, cifrada (lib/crypto.ts). */
  apiKeyEnc: string;
  apiKeyPrefix: string | null;
  createdAt: string;
  /** Último transactions.created recebido. */
  lastWebhookAt: string | null;
  /** Até onde as transações já foram buscadas (para o updated_since). */
  lastSyncAt: string | null;
  pendingNewTransactions: boolean;
}

export interface WebhookRecord {
  id: string;
  receivedAt: string;
  type: string;
  eventId: string | null;
  snabberClientId: number | null;
  signatureValid: boolean;
  reason: string | null;
  payload: unknown;
}

interface Db {
  customers: Customer[];
  webhooks: WebhookRecord[];
}

const DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DIR, 'db.json');
const MAX_WEBHOOKS = 200;

let queue: Promise<unknown> = Promise.resolve();

async function read(): Promise<Db> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const db = JSON.parse(raw) as Db;
    return { customers: db.customers ?? [], webhooks: db.webhooks ?? [] };
  } catch {
    return { customers: [], webhooks: [] };
  }
}

async function write(db: Db): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, FILE);
}

/** Leitura + escrita serializadas, para dois requests não se atropelarem. */
export function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    db.webhooks = db.webhooks.slice(0, MAX_WEBHOOKS);
    await write(db);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function listCustomers(): Promise<Customer[]> {
  return (await read()).customers;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return (await read()).customers.find((c) => c.id === id) ?? null;
}

export async function listWebhooks(): Promise<WebhookRecord[]> {
  return (await read()).webhooks;
}

export function newCustomerId(): string {
  return `cli_${crypto.randomBytes(5).toString('hex')}`;
}
