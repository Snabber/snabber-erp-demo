import { clearWebhooksAction } from '@/lib/actions';
import { listWebhooks } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function Webhooks() {
  const hooks = await listWebhooks();
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Webhooks recebidos</h1>
        <form action={clearWebhooksAction}>
          <button type="submit">Limpar</button>
        </form>
      </div>
      <div className="card">
        {hooks.length === 0 ? (
          <p className="muted">
            Nada ainda. Cadastre <code>{'<APP_BASE_URL>'}/api/webhooks/snabber</code> em /org › Webhook na Snabber e clique em &quot;Enviar
            evento de teste&quot;.
          </p>
        ) : (
          <table>
            <thead>
              <tr><th>Recebido</th><th>Evento</th><th>Cliente</th><th>Assinatura</th><th>Payload</th></tr>
            </thead>
            <tbody>
              {hooks.map((h) => (
                <tr key={h.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(h.receivedAt).toLocaleString('pt-BR')}</td>
                  <td><code>{h.type}</code></td>
                  <td>{h.snabberClientId ? `#${h.snabberClientId}` : '—'}</td>
                  <td>{h.signatureValid ? <span className="badge ok">válida</span> : <span className="badge">{h.reason}</span>}</td>
                  <td>
                    <details>
                      <summary className="muted">ver</summary>
                      <pre>{JSON.stringify(h.payload, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
