// Creates dashboard credentials in cms/.env (gitignored): `npm run setup -- <username>`
// The password is read from CMS_SETUP_PASSWORD or generated, shown once, and stored only as a hash.
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CMS_DIR } from './runtime-node';

const file = join(CMS_DIR, '.env');
const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
if (/^ADMIN_PASS_HASH=/m.test(current)) { console.log('cms/.env already has dashboard credentials. Remove the ADMIN_* lines to regenerate.'); process.exit(0); }
const user = process.argv[2] || 'admin';
const generated = !process.env.CMS_SETUP_PASSWORD;
const password = process.env.CMS_SETUP_PASSWORD || randomBytes(12).toString('base64url');
appendFileSync(file, `${current && !current.endsWith('\n') ? '\n' : ''}ADMIN_USER="${user}"\nADMIN_PASS_HASH="${createHash('sha256').update(password).digest('hex')}"\nADMIN_JWT_SECRET="${randomBytes(32).toString('hex')}"\n`);
console.log(`Dashboard user "${user}" written to cms/.env.`);
if (generated) console.log(`Generated password (shown once): ${password}`);
