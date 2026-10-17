import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  session: false,
  site: 'https://www.animesparks.blog',
  // Tool URLs renamed after launch (franchise slug made editorial).
  redirects: {
    '/tools/anime-watch-order/bakemonogatari': '/tools/anime-watch-order/monogatari',
  },
  adapter: cloudflare({ imageService: 'compile' }),
  image: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.animesparks.blog' }],
  },
  vite: {
    ssr: { noExternal: ['mongodb', 'mongodb-connection-string-url', 'whatwg-url', 'tr46', 'punycode'] },
    plugins: [{
      name: 'prebundle-mongodb-for-workerd',
      configEnvironment(environment) {
        if (environment === 'client') return;
        return {
          optimizeDeps: {
            include: ['mongodb', 'mongodb-connection-string-url', 'whatwg-url', 'tr46', 'punycode'],
            exclude: ['fuse.js'],
          },
        };
      },
    }],
  },
});
