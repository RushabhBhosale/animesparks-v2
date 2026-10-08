"""Read-only public HTML comparison for representative Stage 2 routes."""

from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from pathlib import Path
import json
import sys

OLD = 'https://www.animesparks.blog'
NEW = 'https://animesparks-v2.rushabhbhosale25757.workers.dev'
PATHS = [
    '/', '/blogs', '/blogs/es', '/categories', '/categories/anime-opinions',
    '/tags/One%20Piece', '/trending', '/my-anime-list', '/search?q=haki',
    '/about', '/blog/one-piece-haki-explained-types-advanced-forms',
    '/blog/the-eminence-in-shadow-anime-review-why-this-isekai-works-2025',
    '/blog/anime-with-the-best-first-episode-of-all-time',
    '/es/blog/haki-one-piece-tipos-formas-avanzadas',
    '/es/blog/energia-maldita-jujutsu-kaisen-como-funciona',
]


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonical = []
        self.hreflang = []
        self.title = ''
        self.h1 = ''
        self.h2 = []
        self.images = 0
        self.links = set()
        self.article_text = ''
        self.schemas = []
        self._title = False
        self._heading = None
        self._article = 0
        self._script = False
        self._jsonld = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self._title = True
        if tag in ('h1', 'h2'):
            self._heading = tag
            if tag == 'h2': self.h2.append('')
        if tag == 'article': self._article += 1
        if tag == 'script':
            self._script = True
            self._jsonld = '' if a.get('type') == 'application/ld+json' else None
        if tag == 'meta': self.meta[a.get('name') or a.get('property')] = a.get('content')
        if tag == 'link':
            if a.get('rel') == 'canonical': self.canonical.append(a.get('href'))
            if a.get('rel') == 'alternate' and a.get('hreflang'): self.hreflang.append((a.get('hreflang'), a.get('href')))
        if tag == 'img': self.images += 1
        if tag == 'a':
            href = a.get('href') or ''
            if href.startswith('/') and not href.startswith('//'): self.links.add(href.split('?')[0])
            elif href.startswith(OLD): self.links.add(href[len(OLD):].split('?')[0])

    def handle_endtag(self, tag):
        if tag == 'title': self._title = False
        if tag in ('h1', 'h2'): self._heading = None
        if tag == 'article': self._article = max(0, self._article - 1)
        if tag == 'script':
            if self._jsonld:
                try:
                    value = json.loads(self._jsonld)
                    entries = value if isinstance(value, list) else [value]
                    for entry in entries:
                        if isinstance(entry, dict):
                            kind = entry.get('@type')
                            if kind: self.schemas.append(kind)
                except json.JSONDecodeError: pass
            self._script = False
            self._jsonld = ''

    def handle_data(self, value):
        if self._script:
            if self._jsonld is not None: self._jsonld += value
            return
        if self._title: self.title += value
        if self._heading == 'h1': self.h1 += value
        if self._heading == 'h2': self.h2[-1] += value
        if self._article: self.article_text += value + ' '


def fetch(base, path):
    req = Request(base + path, headers={'User-Agent': 'Mozilla/5.0 AnimeSparksParityAudit'})
    try:
        with urlopen(req, timeout=25) as response:
            status, headers, data = response.status, response.headers, response.read()
    except HTTPError as error:
        status, headers, data = error.code, error.headers, error.read()
    page = Document()
    page.feed(data.decode('utf-8', 'replace'))
    return {
        'status': status, 'title': page.title.strip(),
        'description': page.meta.get('description'), 'canonical': page.canonical,
        'robots': page.meta.get('robots'), 'robots_header': headers.get('X-Robots-Tag'),
        'h1': page.h1.strip(), 'hreflang': sorted(page.hreflang),
        'og_title': page.meta.get('og:title'), 'og_description': page.meta.get('og:description'),
        'og_url': page.meta.get('og:url'), 'og_image': page.meta.get('og:image'),
        'twitter_title': page.meta.get('twitter:title'), 'twitter_description': page.meta.get('twitter:description'),
        'jsonld_types': sorted(set(page.schemas)), 'article_text_chars': len(page.article_text.strip()),
        'image_count': page.images, 'internal_links': sorted(page.links),
        'sections': [item.strip() for item in page.h2[:18]],
    }


def main():
    rows = []
    for path in PATHS:
        old, new = fetch(OLD, path), fetch(NEW, path)
        same = {key: old[key] == new[key] for key in ('status', 'title', 'description', 'canonical', 'h1', 'hreflang', 'og_title', 'og_description', 'og_url', 'og_image', 'twitter_title', 'twitter_description', 'jsonld_types')}
        row = {'path': path, 'old': old, 'new': new, 'same': same,
               'expected_difference': {'robots': [old['robots'], new['robots']]},
               'differences': [key for key, value in same.items() if not value]}
        rows.append(row)
        print(path, old['status'], new['status'], ','.join(row['differences']) or 'core metadata match', flush=True)
    target = Path(sys.argv[1] if len(sys.argv) > 1 else '/private/tmp/animesparks-stage2-parity.json')
    target.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    print('saved', target)


if __name__ == '__main__': main()
