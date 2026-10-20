// Configuração do ERP de demo (ver .env.example). Tudo só no servidor: nada disto vai ao navegador.

export const config = {
  snabberBaseUrl: (process.env.SNABBER_BASE_URL || 'https://snabber.com.br').replace(/\/$/, ''),
  orgKey: process.env.SNABBER_ORG_KEY || '',
  webhookSecret: process.env.SNABBER_WEBHOOK_SECRET || '',
  appBaseUrl: (process.env.APP_BASE_URL || 'http://localhost:3200').replace(/\/$/, ''),
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || '',
};

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!config.orgKey) missing.push('SNABBER_ORG_KEY');
  if (!config.webhookSecret) missing.push('SNABBER_WEBHOOK_SECRET');
  if (!config.dataEncryptionKey) missing.push('DATA_ENCRYPTION_KEY');
  return missing;
}
