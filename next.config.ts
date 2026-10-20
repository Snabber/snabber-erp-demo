import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O ERP de demo nunca deve ser indexado nem cacheado: só mostra dados de teste.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }];
  },
};

export default nextConfig;
