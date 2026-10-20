import Link from 'next/link';
import { getCustomer } from '@/lib/store';

export const dynamic = 'force-dynamic';

// redirect_url dos links de conexão. A Snabber acrescenta status, client_id e connection_id.
const LABELS: Record<string, { text: string; cls: string }> = {
  success: { text: 'Conta conectada. As transações chegam em alguns minutos.', cls: 'ok' },
  pending: { text: 'O cliente voltou do banco; a conexão ainda está sendo confirmada (chega pelo webhook connection.created).', cls: 'warn' },
  cancelled: { text: 'O cliente saiu sem conectar.', cls: 'warn' },
  error: { text: 'A conexão deu erro. Tente de novo.', cls: 'err' },
};

export default async function Return({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; status?: string; client_id?: string; connection_id?: string }>;
}) {
  const sp = await searchParams;
  const customer = sp.cliente ? await getCustomer(sp.cliente) : null;
  const label = LABELS[sp.status ?? ''] ?? { text: `Status: ${sp.status ?? 'desconhecido'}`, cls: 'warn' };
  return (
    <>
      <h1>Retorno da conexão bancária</h1>
      <div className={`flash ${label.cls}`}>{label.text}</div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Parâmetros recebidos no redirect_url:</p>
        <pre>{JSON.stringify(sp, null, 2)}</pre>
      </div>
      {customer && (
        <Link className="btn primary" href={`/clientes/${customer.id}`}>
          Voltar para {customer.name}
        </Link>
      )}
    </>
  );
}
