import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  session: false,
  site: 'https://www.animesparks.blog',
  adapter: cloudflare({ imageService: 'compile' }),
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
