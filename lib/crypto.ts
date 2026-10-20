import crypto from 'crypto';
import { config } from './config';

// Cifra as chaves de API dos clientes antes de gravar em disco, como a documentação da Snabber
// pede ("guarde a chave do cliente criptografada"). AES-256-GCM; formato: iv.tag.texto (base64url).

function key(): Buffer {
  if (!config.dataEncryptionKey) throw new Error('DATA_ENCRYPTION_KEY não configurada');
  return crypto.createHash('sha256').update(config.dataEncryptionKey).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

export function decryptSecret(payload: string): string {
  const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
