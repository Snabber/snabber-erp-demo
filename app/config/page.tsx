import { config, missingConfig } from '@/lib/config';
import { orgApi, SnabberError } from '@/lib/snabber';

export const dynamic = 'force-dynamic';

export default async function Config() {
  const missing = missingConfig();
  let check: { ok: boolean; text: string };
  if (!config.orgKey) {
    check = { ok: false, text: 'SNABBER_ORG_KEY vazia.' };
  } else {
    try {
      const res = await orgApi.listClients();
      check = { ok: true, text: `Chave da org válida — ${res.data.length} cliente(s) na Snabber.` };
    } catch (err) {
      check = { ok: false, text: err instanceof SnabberError ? `${err.status} ${err.code}: ${err.message}` : String(err) };
    }
  }
  const mask = (v: string) => (v ? `${v.slice(0, 12)}…` : '(vazio)');
  return (
    <>
      <h1>Configuração</h1>
      <div className={`flash ${check.ok ? 'ok' : 'err'}`}>{check.text}</div>
      <div className="card">
        <table>
          <tbody>
            <tr><th>SNABBER_BASE_URL</th><td><code>{config.snabberBaseUrl}</code></td></tr>
            <tr><th>SNABBER_ORG_KEY</th><td><code>{mask(config.orgKey)}</code></td></tr>
            <tr><th>SNABBER_WEBHOOK_SECRET</th><td><code>{mask(config.webhookSecret)}</code></td></tr>
            <tr><th>APP_BASE_URL</th><td><code>{config.appBaseUrl}</code></td></tr>
            <tr><th>DATA_ENCRYPTION_KEY</th><td>{config.dataEncryptionKey ? 'configurada' : '(vazia)'}</td></tr>
          </tbody>
        </table>
        {missing.length > 0 && <p className="muted">Falta: {missing.join(', ')} (arquivo .env, depois reinicie o npm run dev).</p>}
      </div>
      <div className="card">
        <h2>Na Snabber (/org)</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Domínio de retorno: <code>{new URL(config.appBaseUrl).hostname}</code></li>
          <li>Webhook: <code>{config.appBaseUrl}/api/webhooks/snabber</code></li>
          <li>Documentação da API: <a href={`${config.snabberBaseUrl}/developers/org`}>{config.snabberBaseUrl}/developers/org</a></li>
        </ul>
      </div>
    </>
  );
}
