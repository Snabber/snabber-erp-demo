import crypto from 'crypto';

// Verificação dos webhooks da Snabber, exatamente como a documentação de orgs descreve:
// x-snabber-signature = "sha256=" + HMAC-SHA256(segredo, `${x-snabber-timestamp}.${corpo bruto}`),
// rejeitando eventos com mais de 5 minutos (anti-replay).

const MAX_SKEW_SECONDS = 300;

export function verifySnabberSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string
): { ok: true } | { ok: false; reason: string } {
  if (!secret) return { ok: false, reason: 'SNABBER_WEBHOOK_SECRET não configurado' };
  if (!timestamp || !signature) return { ok: false, reason: 'Headers de assinatura ausentes' };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: 'Timestamp fora da janela de 5 minutos' };
  }
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'Assinatura inválida' };
  return { ok: true };
}
