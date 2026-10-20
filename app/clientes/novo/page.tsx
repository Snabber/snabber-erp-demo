import { createCustomerAction } from '@/lib/actions';
import Flash from '../../flash';

export const dynamic = 'force-dynamic';

export default async function NewCustomer({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1>Novo cliente</h1>
      <Flash erro={sp.erro} />
      <form action={createCustomerAction} className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          O ERP chama <code>POST /api/v1/org/clients</code> com a chave da org. A Snabber devolve a chave do cliente uma única vez; este
          ERP guarda ela cifrada em <code>.data/db.json</code>.
        </p>
        <div className="grid">
          <div>
            <label htmlFor="name">Nome ou razão social</label>
            <input id="name" name="name" type="text" required maxLength={200} placeholder="Padaria Exemplo Ltda" />
          </div>
          <div>
            <label htmlFor="document">CNPJ (opcional)</label>
            <input id="document" name="document" type="text" maxLength={20} />
          </div>
          <div>
            <label htmlFor="max_connections">Limite de conexões (opcional)</label>
            <input id="max_connections" name="max_connections" type="number" min={0} max={100} placeholder="sem limite próprio" />
          </div>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400, margin: 0 }}>
            <input type="checkbox" name="sandbox" defaultChecked /> Cliente de teste (banco &quot;Pluggy Bank&quot;)
          </label>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button type="submit" className="primary">Criar cliente</button>
        </div>
      </form>
    </>
  );
}
