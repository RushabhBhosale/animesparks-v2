import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const output = 'dist';
const localSecretCopy = join(output, 'server', '.dev.vars');
if (existsSync(localSecretCopy)) rmSync(localSecretCopy);
const localSecrets = '.dev.vars';
if (existsSync(localSecrets)) {
  const line = readFileSync(localSecrets, 'utf8').split(/\r?\n/).find(x => x.startsWith('MONGODB_URI='));
  if (line) {
    const uri = JSON.parse(line.slice('MONGODB_URI='.length));
    const inspect = dir => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) inspect(file);
        else if (readFileSync(file).includes(uri)) throw new Error('Build output contains a local secret');
      }
    };
    inspect(output);
  }
}
console.log('Deploy output contains no local MongoDB secret');
