import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP Demo · Snabber Orgs',
  description: 'ERP de demonstração da API de Orgs da Snabber',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="top">
          <div className="inner">
            <strong>ERP Demo</strong>
            <nav>
              <Link href="/">Clientes</Link>
              <Link href="/clientes/novo">Novo cliente</Link>
              <Link href="/webhooks">Webhooks recebidos</Link>
              <Link href="/config">Configuração</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
