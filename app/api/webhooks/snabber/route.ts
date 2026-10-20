import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { mutate } from '@/lib/store';
import { verifySnabberSignature } from '@/lib/webhook';
import crypto from 'crypto';

// POST /api/webhooks/snabber — recebe os eventos da Snabber (URL cadastrada em /org › Webhook).
// Verifica a assinatura com o corpo BRUTO (antes de qualquer JSON.parse) e grava tudo, válido ou
// não, para aparecer em /webhooks. Evento inválido recebe 401; válido, 200 em seguida.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const check = verifySnabberSignature(
    raw,
    request.headers.get('x-snabber-timestamp'),
    request.headers.get('x-snabber-signature'),
    config.webhookSecret
  );

  let payload: any = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = raw.slice(0, 2000);
  }

  await mutate((db) => {
    // Deduplica pelo id do evento: a Snabber pode reenviar.
    if (check.ok && payload?.id && db.webhooks.some((w) => w.eventId === payload.id && w.signatureValid)) return;
    db.webhooks.unshift({
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      type: payload?.type ?? 'desconhecido',
      eventId: payload?.id ?? null,
      snabberClientId: typeof payload?.client_id === 'number' ? payload.client_id : null,
      signatureValid: check.ok,
      reason: check.ok ? null : check.reason,
      payload,
    });
    if (check.ok && payload?.type === 'transactions.created') {
      const customer = db.customers.find((c) => c.snabberClientId === payload.client_id);
      if (customer) {
        customer.pendingNewTransactions = true;
        customer.lastWebhookAt = new Date().toISOString();
      }
    }
  });

  return check.ok ? NextResponse.json({ received: true }) : NextResponse.json({ error: check.reason }, { status: 401 });
}
