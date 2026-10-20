import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decryptSecret } from '@/lib/crypto';
import { clientApi, SnabberError, type Account, type Connection, type Transaction } from '@/lib/snabber';
import { getCustomer } from '@/lib/store';
import { deleteConnectionAction, deleteCustomerAction, rotateKeyAction, syncAction, updateLimitAction } from '@/lib/actions';
import Flash from '../../flash';

export const dynamic = 'force-dynamic';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  // Tudo com a chave DESTE cliente: ela só enxerga o espaço de dados dele.
  let connections: Connection[] = [];
  let accounts: Account[] = [];
  let transactions: Transaction[] = [];
  let apiError: string | null = null;
  try {
    const key = decryptSecret(customer.apiKeyEnc);
    const [c, a, t] = await Promise.all([clientApi.listConnections(key), clientApi.listAccounts(key), clientApi.listTransactions(key, { limit: 50 })]);
    connections = c.data;
    accounts = a.data;
    transactions = t.data;
  } catch (err) {
    apiError = err instanceof SnabberError ? `${err.code}: ${err.message}` : String(err);
  }

  return (
    <>
      <p className="muted" style={{ margin: '0 0 6px' }}>
        <Link href="/">← Clientes</Link>
      </p>
      <h1>
        {customer.name} {customer.sandbox && <span className="badge">teste</span>}
      </h1>
      <Flash ok={sp.ok} erro={sp.erro} />
      {apiError && <div className="flash err">Erro na API da Snabber: {apiError}</div>}
      {customer.pendingNewTransactions && (
        <div className="flash ok">
          Chegou um webhook <code>transactions.created</code> em {dt(customer.lastWebhookAt)}. Use &quot;Buscar novidades&quot;.
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Contas bancárias</h2>
            <span className="muted">
              Id no ERP <code>{customer.id}</code> · cliente Snabber <code>#{customer.snabberClientId}</code> · chave <code>{customer.apiKeyPrefix}…</code>
            </span>
          </div>
          <a className="btn primary" href={`/clientes/${customer.id}/conectar`} target="_blank" rel="noopener">
            Conectar banco
          </a>
        </div>

        {connections.length === 0 ? (
          <p className="muted">Nenhuma conexão. O link abre a página da Snabber com a marca da sua Org, em nova aba.</p>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Banco</th><th>Status</th><th>Último sync</th><th></th></tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.connection_id}>
                  <td>{c.institution ?? '—'} <span className="muted">#{c.connection_id}</span></td>
                  <td>{c.status ?? '—'}</td>
                  <td>{dt(c.last_sync_at)}</td>
                  <td>
                    <div className="row">
                      <a className="btn" href={`/clientes/${customer.id}/conectar?connection_id=${c.connection_id}`} target="_blank" rel="noopener">
                        Reconectar
                      </a>
                      <form action={deleteConnectionAction} className="row">
                        <input type="hidden" name="id" value={customer.id} />
                        <input type="hidden" name="connection_id" value={c.connection_id} />
                        <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontWeight: 400, margin: 0 }}>
                          <input type="checkbox" name="delete_data" /> apagar dados
                        </label>
                        <button type="submit" className="danger">Remover</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {accounts.length > 0 && (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Conta</th><th>Tipo</th><th>Instituição</th><th className="num">Saldo</th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.name ?? '—'}</td>
                  <td>{a.type ?? '—'}</td>
                  <td>{a.institution?.name ?? '—'}</td>
                  <td className={`num ${a.balance != null && a.balance < 0 ? 'neg' : ''}`}>{a.balance == null ? '—' : brl.format(a.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Transações (categorizadas pela Snabber)</h2>
            <span className="muted">Últimas 50 · busca incremental desde {dt(customer.lastSyncAt)}</span>
          </div>
          <form action={syncAction}>
            <input type="hidden" name="id" value={customer.id} />
            <button type="submit">Buscar novidades (updated_since)</button>
          </form>
        </div>
        {transactions.length === 0 ? (
          <p className="muted">Sem transações ainda. Depois de conectar, o primeiro sync leva alguns minutos.</p>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th className="num">Valor</th></tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description ?? '—'}</td>
                  <td>{t.category_parent ? `${t.category_parent} › ${t.category}` : t.category ?? '—'}</td>
                  <td>{t.account ?? '—'}</td>
                  <td className={`num ${t.amount != null && t.amount < 0 ? 'neg' : ''}`}>{t.amount == null ? '—' : brl.format(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Administração (chave da org)</h2>
        <div className="grid">
          <form action={updateLimitAction}>
            <input type="hidden" name="id" value={customer.id} />
            <label htmlFor="max_connections">Limite de conexões deste cliente</label>
            <div className="row">
              <input id="max_connections" name="max_connections" type="number" min={0} max={100} defaultValue={customer.maxConnections ?? ''} placeholder="sem limite próprio" style={{ maxWidth: 160 }} />
              <button type="submit">Salvar</button>
            </div>
          </form>
          <form action={rotateKeyAction}>
            <input type="hidden" name="id" value={customer.id} />
            <label>Chave de API do cliente</label>
            <button type="submit">Trocar chave (rotate-key)</button>
          </form>
          <form action={deleteCustomerAction}>
            <input type="hidden" name="id" value={customer.id} />
            <label>Remover cliente</label>
            <button type="submit" className="danger">Remover na Snabber e no ERP</button>
            <p className="muted" style={{ margin: '4px 0 0' }}>Apaga conexões, dados e a chave. Não tem volta.</p>
          </form>
        </div>
      </div>
    </>
  );
}
