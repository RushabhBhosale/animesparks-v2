import assert from 'node:assert/strict';

const origin = 'https://www.animesparks.blog';
const fetchPage = async path => {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  return { response, body: await response.text() };
};

const { body: manifestText } = await fetchPage('/content-manifest.json');
const manifest = JSON.parse(manifestText);
assert.equal(manifest.schema, 1, 'production manifest schema is unsupported');
assert.equal(manifest.fingerprint, process.env.EXPECTED_FINGERPRINT, 'production fingerprint does not match the build');

const { body: home } = await fetchPage('/');
assert.match(home, /<meta name="robots" content="index, follow"/);
assert.match(home, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
assert.match(home, /<link rel="canonical" href="https:\/\/www\.animesparks\.blog\//);

const { body: inventoryText } = await fetchPage('/route-inventory.json');
const inventory = JSON.parse(inventoryText);
const enPath = inventory.find(path => /^\/blog\/[a-z0-9-]+\/?$/.test(path));
const esPath = inventory.find(path => /^\/es\/blog\/[a-z0-9-]+\/?$/.test(path));
assert.ok(enPath, 'no English article path in the generated route inventory');
assert.ok(esPath, 'no Spanish article path in the generated route inventory');
for (const path of [enPath, esPath]) {
  const { body } = await fetchPage(path);
  assert.match(body, /<title>[^<]+<\/title>/, `${path} has no title`);
  assert.match(body, /<meta name="description" content="[^"]+/i, `${path} has no SEO description`);
  assert.match(body, /<link rel="canonical" href="https:\/\/www\.animesparks\.blog\//, `${path} has no production canonical`);
  assert.match(body, /hreflang="(?:en|es)"/, `${path} has no language alternate`);
  assert.match(body, /application\/ld\+json/, `${path} has no JSON-LD`);
  assert.match(body, /<article[\s>]/, `${path} has no article body`);
  assert.match(body, /images\.animesparks\.blog\//, `${path} has no R2 image reference`);
  assert.match(body, /<ins[^>]+class="adsbygoogle"/, `${path} has no AdSense slot`);
  const imageUrl = body.match(/https:\/\/images\.animesparks\.blog\/[^"'\s<>]+/)?.[0]?.replaceAll('&amp;', '&');
  assert.ok(imageUrl, `${path} has no fetchable R2 image URL`);
  const image = await fetch(imageUrl, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
  assert.equal(image.status, 200, `R2 image returned HTTP ${image.status}: ${path}`);
  assert.match(image.headers.get('content-type') || '', /^image\//i, `R2 image has a non-image content type: ${path}`);
}

for (const path of ['/blogs', '/blogs/es', '/my-anime-list']) await fetchPage(path);

const { body: sitemap } = await fetchPage('/sitemap.xml');
assert.match(sitemap, /https:\/\/www\.animesparks\.blog\//);
assert.doesNotMatch(sitemap, /workers\.dev|cdn\.sanity\.io/);
assert.doesNotMatch(sitemap, /<loc>https:\/\/(?!www\.animesparks\.blog)/);
const { body: rss } = await fetchPage('/rss.xml');
assert.match(rss, /<item>/);
assert.match(rss, /https:\/\/www\.animesparks\.blog\//);

const admin = await fetch('https://admin.animesparks.blog/admin/login', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
assert.equal(admin.status, 200, `admin login returned HTTP ${admin.status}`);
const adminApi = await fetch('https://admin.animesparks.blog/api/admin/articles/list', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
assert.equal(adminApi.status, 401, `unauthenticated admin API returned HTTP ${adminApi.status}`);

const staging = await fetch('https://animesparks-v2.rushabhbhosale25757.workers.dev/', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
assert.equal(staging.status, 200, `workers.dev returned HTTP ${staging.status}`);
assert.match(staging.headers.get('x-robots-tag') || '', /noindex,\s*nofollow/i);
const stagingHtml = await staging.text();
assert.match(stagingHtml, /<meta name="robots" content="noindex, nofollow"/);
assert.doesNotMatch(stagingHtml, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);

const apex = await fetch('https://animesparks.blog/', { redirect: 'manual', signal: AbortSignal.timeout(20000) });
assert.equal(apex.status, 301, `apex host returned HTTP ${apex.status}`);
assert.equal(new URL(apex.headers.get('location')).hostname, 'www.animesparks.blog');

console.log('Production fingerprint, representative EN/ES articles, SEO, sitemap, RSS, admin access, R2 references, AdSense and workers.dev noindex checks passed.');
