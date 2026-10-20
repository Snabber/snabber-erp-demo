import Link from 'next/link';
import { missingConfig } from '@/lib/config';
import { orgApi, SnabberError, type OrgClient } from '@/lib/snabber';
import { listCustomers } from '@/lib/store';
import Flash from './flash';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const missing = missingConfig();
  const customers = await listCustomers();

  // Estado do lado da Snabber (conexões usadas por cliente), pela chave da org.
  let remote: Map<number, OrgClient> = new Map();
  let remoteError: string | null = null;
  if (!missing.includes('SNABBER_ORG_KEY')) {
    try {
      remote = new Map((await orgApi.listClients()).data.map((c) => [c.client_id, c]));
    } catch (err) {
      remoteError = err instanceof SnabberError ? `${err.code}: ${err.message}` : String(err);
    }
  }

  return (
    <>
      <h1>Clientes</h1>
      <Flash ok={sp.ok} erro={sp.erro} />
      {missing.length > 0 && (
        <div className="flash warn">
          Falta configurar: {missing.join(', ')}. Veja <Link href="/config">Configuração</Link>.
        </div>
      )}
      {remoteError && <div className="flash err">Não consegui falar com a Snabber: {remoteError}</div>}

      <div className="card">
        {customers.length === 0 ? (
          <p className="muted">
            Nenhum cliente ainda. <Link href="/clientes/novo">Cadastre o primeiro</Link> — ele é criado na Snabber como cliente da sua Org.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Id no ERP</th>
                <th>Snabber</th>
                <th>Conexões</th>
                <th>Novidades</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const r = remote.get(c.snabberClientId);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`}>{c.name}</Link> {c.sandbox && <span className="badge">teste</span>}
                    </td>
                    <td><code>{c.id}</code></td>
                    <td><code>#{c.snabberClientId}</code></td>
                    <td>
                      {r ? r.connections_used : '—'}
                      {c.maxConnections != null && ` / ${c.maxConnections}`}
                    </td>
                    <td>{c.pendingNewTransactions ? <span className="badge ok">transações novas</span> : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
