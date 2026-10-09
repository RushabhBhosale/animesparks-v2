import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tagIndexability } from '../src/lib/content/tag-seo.ts';

const root = 'dist/client';
const read = path => readFileSync(join(root, path), 'utf8');
const htmlFiles = [];
function collectHtml(directory = '') {
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const relative = join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(relative);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(relative);
  }
}
collectHtml();
// robots.txt is a host-aware Astro route, so verify its production branch.
const robotsRoute = readFileSync('src/pages/robots.txt.ts', 'utf8');
assert.ok(robotsRoute.includes("User-agent: *\\nAllow: /\\n"), 'production robots route must allow crawling');
assert.match(robotsRoute, /Sitemap: https:\/\/www\.animesparks\.blog\/sitemap\.xml/);
assert.match(robotsRoute, /hostname !== 'www\.animesparks\.blog'/);
assert.doesNotMatch(read('_headers'), /X-Robots-Tag:\s*noindex/i, 'production assets must not inherit staging noindex headers');

const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.ok(urls.length > 0, 'production sitemap must include indexable URLs');
assert.equal(new Set(urls).size, urls.length, 'sitemap contains duplicate URLs');
for (const url of urls) {
  assert.equal(new URL(url).origin, 'https://www.animesparks.blog', `nonproduction sitemap URL: ${url}`);
}
assert.doesNotMatch(sitemap, /workers\.dev|draft/i, 'sitemap contains staging or draft markers');

const listingData = JSON.parse(read('listing-data.json'));
const contentManifest = JSON.parse(read('content-manifest.json'));
assert.equal(contentManifest.schema, 1, 'content manifest schema is unsupported');
assert.match(contentManifest.fingerprint, /^[a-f0-9]{64}$/, 'content manifest fingerprint is invalid');
const allCards = [...listingData.english, ...listingData.spanish];
const routeInventory = JSON.parse(read('route-inventory.json'));
const variantRoutes = JSON.parse(read('tag-route-map.json'));
const allTags = routeInventory.filter(path => path.startsWith('/tags/')).map(path => decodeURIComponent(path.slice('/tags/'.length)));
const variantTags = new Set(Object.keys(variantRoutes));
const primaryTags = allTags.filter(tag => !variantTags.has(tag));
const tagStatus = tagIndexability(primaryTags, allCards);
const expectedSitemapTags = new Set(primaryTags.filter(tag => tagStatus.get(tag)).map(tag => `/tags/${encodeURIComponent(tag)}`));
const actualSitemapTags = new Set(urls.map(url => new URL(url).pathname).filter(path => path.startsWith('/tags/')));
assert.deepEqual(actualSitemapTags, expectedSitemapTags, 'sitemap tags do not match indexable archives');
for (const tag of primaryTags) {
  const html = read(`${decodeURIComponent(`/tags/${tag}`).slice(1)}/index.html`);
  const shouldIndex = tagStatus.get(tag);
  assert.match(html, new RegExp(`<meta name="robots" content="${shouldIndex ? 'index, follow' : 'noindex, follow'}"`), `incorrect tag robots directive: ${tag}`);
}
for (const [tag, route] of Object.entries(variantRoutes)) {
  const html = read(`${route.slice(1)}index.html`);
  assert.match(html, /<meta name="robots" content="noindex, follow"/, `case variant must be nonindexable: ${tag}`);
}

const inventory = JSON.parse(read('route-inventory.json'));
const publicArticlePaths = inventory.filter(path => /^(?:\/es)?\/blog\//.test(path));
assert.ok(publicArticlePaths.length > 0, 'published article route inventory is empty');
const canonicalRoutes = new Set();
for (const path of publicArticlePaths) {
  const diskPath = join(root, decodeURIComponent(path).replace(/^\//, ''), 'index.html');
  const html = readFileSync(diskPath, 'utf8');
  assert.match(html, /<meta name="robots" content="index, follow"/, `article route is not indexable: ${path}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  assert.ok(canonical, `missing canonical: ${path}`);
  assert.equal(new URL(canonical[1]).origin, 'https://www.animesparks.blog', `incorrect canonical: ${path}`);
  assert.match(html, /<h1(?:\s|>)/, `missing H1: ${path}`);
  assert.match(html, /application\/ld\+json/, `missing structured data: ${path}`);
  canonicalRoutes.add(canonical[1]);
}
for (const path of ['/index.html', '/blogs/index.html', '/categories/index.html', '/about/index.html']) {
  const html = read(path);
  assert.match(html, /<meta name="robots" content="index, follow"/, `public route not indexable: ${path}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  assert.ok(canonical, `production canonical missing: ${path}`);
  assert.equal(new URL(canonical[1]).origin, 'https://www.animesparks.blog', `incorrect canonical: ${path}`);
}
assert.ok(canonicalRoutes.size === publicArticlePaths.length, 'article canonicals are not unique');
console.log(`[production-safety] Passed indexability, canonical, sitemap, robots, H1 and JSON-LD checks for ${publicArticlePaths.length} published article routes and ${expectedSitemapTags.size} indexable tags.`);

let checkedImages = 0;
for (const file of htmlFiles) {
  const html = read(file);
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const image = match[0];
    assert.match(image, /\bwidth=["']\d+["']/i, `${file} has an image without intrinsic width`);
    assert.match(image, /\bheight=["']\d+["']/i, `${file} has an image without intrinsic height`);
    const refs = [image.match(/\bsrc=["']([^"']+)/i)?.[1] || ''];
    const srcset = image.match(/\bsrcset=["']([^"']+)/i)?.[1] || '';
    refs.push(...srcset.split(',').map(candidate => candidate.trim().split(/\s+/)[0]));
    for (const ref of refs) {
      if (!ref.startsWith('/_astro/')) continue;
      assert.ok(existsSync(join(root, decodeURIComponent(ref.slice(1)))), `${file} references missing optimized image ${ref}`);
    }
    checkedImages++;
  }
}
assert.ok(checkedImages > 0, 'production output contains no images to verify');
const homepage = read('index.html');
if (!homepage.includes('class="cover-story__image-wrap"')) {
  assert.match(homepage, /cover-story--text-only/, 'image-free featured article must use full-width text layout');
  assert.doesNotMatch(homepage, /cover-story__image-wrap/, 'image-free featured article must not render an empty image container');
} else {
  const cover = homepage.match(/<div class="cover-story__image-wrap">([\s\S]*?)<\/div>/)?.[1] || '';
  const coverImage = cover.match(/<img\b[^>]*>/)?.[0] || '';
  assert.ok(coverImage, 'homepage cover image is missing');
  assert.match(coverImage, /\bfetchpriority=["']high["']/i, 'homepage cover image must have high fetch priority');
  assert.match(coverImage, /\bloading=["']eager["']/i, 'homepage cover image must load eagerly');
}
console.log(`[image-safety] Passed intrinsic dimensions and optimized image references for ${checkedImages} rendered image tags.`);
