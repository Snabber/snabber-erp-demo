import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { decryptSecret } from '@/lib/crypto';
import { clientApi, SnabberError } from '@/lib/snabber';
import { getCustomer } from '@/lib/store';

// GET /clientes/{id}/conectar[?connection_id=] — o servidor do ERP pede o link de conexão à Snabber
// (com a chave do cliente) e redireciona o navegador para ele. O navegador nunca vê a chave.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) return NextResponse.redirect(new URL('/', config.appBaseUrl));

  const connectionId = request.nextUrl.searchParams.get('connection_id');
  try {
    const session = await clientApi.createSession(decryptSecret(customer.apiKeyEnc), {
      redirect_url: `${config.appBaseUrl}/retorno?cliente=${encodeURIComponent(customer.id)}`,
      ...(connectionId ? { connection_id: Number(connectionId) } : {}),
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    const msg = err instanceof SnabberError ? `${err.code}: ${err.message}` : String(err);
    return NextResponse.redirect(new URL(`/clientes/${customer.id}?erro=${encodeURIComponent(msg)}`, config.appBaseUrl));
  }
}
