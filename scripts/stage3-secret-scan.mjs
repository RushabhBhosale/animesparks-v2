// Scan deploy output for secret VALUES without printing them.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const secretFile = '.dev.vars';
const entries = existsSync(secretFile) ? readFileSync(secretFile, 'utf8').split(/\r?\n/) : [];
const keys = ['MONGODB_URI','ADMIN_PASS_HASH','ADMIN_JWT_SECRET','CLOUDFLARE_API_TOKEN','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','SANITY_WRITE_TOKEN','PUBLISHING_KEY'];
const fileValues = keys.map(key => entries.find(line => line.startsWith(`${key}=`))?.slice(key.length+1)).filter(Boolean).map(raw => {
  try { return JSON.parse(raw); } catch { return raw; }
});
const values = [...new Set([...fileValues, ...keys.map(key => process.env[key])])]
  .filter(value => typeof value === 'string' && value.length >= 8);
const findings = [];
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else {
      const data = readFileSync(file);
      if (values.some(value => data.includes(value))) findings.push(file);
      if (file.startsWith('dist/client/') && /\bmongodb(?:\+srv)?:\/\//i.test(data.toString('utf8'))) findings.push(file);
    }
  }
}
scan('dist');
console.log(JSON.stringify({ secretValuesChecked: values.length, findings: [...new Set(findings)] }));
if (findings.length) process.exit(1);
