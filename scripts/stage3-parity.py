"""Read-only exhaustive public SEO comparison. Usage: python3 scripts/stage3-parity.py NEW_BASE REPORT_PATH"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import urlparse
from pathlib import Path
import json, re, sys, time
import xml.etree.ElementTree as ET

OLD = 'https://www.animesparks.blog'
NEW = sys.argv[1].rstrip('/')
REPORT = Path(sys.argv[2])
BASELINE_REPORT = Path(sys.argv[3]) if len(sys.argv) > 3 else None
SITEMAPS = ['/private/tmp/animesparks-prod-sitemap.xml', 'dist/client/sitemap.xml']

class Document(HTMLParser):
    def __init__(self):
        super().__init__(); self.meta={};self.links=set();self.hreflang=[];self.schema=[]
        self.title='';self.h1='';self.lang='';self.images=0;self.image_alt=[];self.captions=[]
        self.article_chars=0;self._title=False;self._h1=False;self._article=0;self._caption=False
        self._jsonld=None;self._canonical=''
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang','')
        if tag=='title':self._title=True
        if tag=='h1':self._h1=True
        if tag=='article':self._article+=1
        if tag=='figcaption':self._caption=True
        if tag=='img':self.images+=1;self.image_alt.append(a.get('alt',''))
        if tag=='meta' and (a.get('name') or a.get('property')):self.meta[a.get('name') or a.get('property')]=a.get('content')
        if tag=='link':
            if a.get('rel')=='canonical':self._canonical=a.get('href','')
            if a.get('rel')=='alternate' and a.get('hreflang'):self.hreflang.append((a.get('hreflang'),a.get('href')))
        if tag=='script' and a.get('type')=='application/ld+json':self._jsonld=''
        if tag=='a':
            h=a.get('href','')
            if h.startswith('/') and not h.startswith('//'):self.links.add(h.split('#')[0].split('?')[0])
            elif h.startswith(OLD):self.links.add(h[len(OLD):].split('#')[0].split('?')[0])
    def handle_endtag(self,tag):
        if tag=='title':self._title=False
        if tag=='h1':self._h1=False
        if tag=='article':self._article=max(0,self._article-1)
        if tag=='figcaption':self._caption=False
        if tag=='script' and self._jsonld is not None:
            try:
                value=json.loads(self._jsonld)
                for x in value if isinstance(value,list) else [value]:
                    if isinstance(x,dict):self.schema.append(x)
            except json.JSONDecodeError:pass
            self._jsonld=None
    def handle_data(self,s):
        if self._jsonld is not None:self._jsonld+=s;return
        if self._title:self.title+=s
        if self._h1:self.h1+=s
        if self._article:self.article_chars+=len(s.strip())
        if self._caption:self.captions.append(s.strip())

def fetch(base,path):
    request=Request(base+path,headers={'User-Agent':'AnimeSparksStage3Parity/1.0','Accept':'text/html'})
    started=time.monotonic()
    try:
        with urlopen(request,timeout=20) as r:status,headers,body=r.status,r.headers,r.read()
    except HTTPError as e:status,headers,body=e.code,e.headers,e.read()
    except Exception as e:return {'error':type(e).__name__+': '+str(e)[:160], 'seconds':round(time.monotonic()-started,3)}
    p=Document();p.feed(body.decode('utf-8','replace'))
    dates=[]
    for s in p.schema:
        for key in ('datePublished','dateModified'):
            if s.get(key):dates.append((key,s[key]))
    return {'status':status,'seconds':round(time.monotonic()-started,3),'title':p.title.strip(),
        'description':p.meta.get('description'),'canonical':p._canonical,'h1':p.h1.strip(),'lang':p.lang,
        'hreflang':[list(item) for item in sorted(p.hreflang)],'robots':p.meta.get('robots'),'robots_header':headers.get('X-Robots-Tag'),
        'og':{k:v for k,v in p.meta.items() if k.startswith('og:')},
        'twitter':{k:v for k,v in p.meta.items() if k.startswith('twitter:')},
        'jsonld_types':sorted(set(str(s.get('@type')) for s in p.schema)), 'dates':[list(item) for item in sorted(dates)],
        'article_chars':p.article_chars,'images':p.images,'image_alt':p.image_alt,'captions':p.captions,
        'internal_links':sorted(p.links)}

def urls(path):
    root=ET.parse(path).getroot()
    return {urlparse(n.text).path for n in root.iter() if n.tag.endswith('loc') and n.text and urlparse(n.text).hostname=='www.animesparks.blog'}

old_urls=urls(SITEMAPS[0]);new_urls=urls(SITEMAPS[1]);inventory=set(json.loads(Path('dist/client/route-inventory.json').read_text()));paths=sorted(old_urls|inventory)
paths += ['/search?q=haki','/blogs?page=2','/blogs/es?page=2','/trending?range=year','/blog/does-not-exist']
baseline = json.loads(BASELINE_REPORT.read_text())['results'] if BASELINE_REPORT else {}
results={path: {'old': baseline[path]['old']} for path in paths} if baseline else {}
with ThreadPoolExecutor(max_workers=12) as pool:
    requests = [(NEW, 'new')] if baseline else [(OLD, 'old'), (NEW, 'new')]
    future_map={pool.submit(fetch,base,path):(path,label) for path in paths for base,label in requests}
    for i,future in enumerate(as_completed(future_map),1):
        path,label=future_map[future];results.setdefault(path,{})[label]=future.result()
        if i%100==0:print(f'{i}/{len(future_map)} fetched',flush=True)
fields=['status','title','description','canonical','h1','lang','hreflang','og','twitter','jsonld_types','dates']
failures=[];new_only=[]
for path,row in results.items():
    old,new=row['old'],row['new']
    if 'error' in new:failures.append({'path':path,'fields':['new_error'],'detail':new['error']});continue
    if 'error' in old:failures.append({'path':path,'fields':['old_error'],'detail':old['error']});continue
    if old['status']==404 and new['status']==200 and path not in old_urls:new_only.append(path);continue
    if old['status']==404 and new['status']==404:continue
    diff=[field for field in fields if old[field]!=new[field]]
    if old['status']==200 and new['status']==200:
        if (path.startswith('/blog/') or path.startswith('/es/blog/')) and old['article_chars']>100 and new['article_chars']<100:diff.append('article_body')
        if old['images']>0 and new['images']==0:diff.append('images')
    if diff:failures.append({'path':path,'fields':diff,'old':{k:old.get(k) for k in diff},'new':{k:new.get(k) for k in diff}})
report={'old_sitemap_urls':len(old_urls),'new_sitemap_urls':len(new_urls),'inventory_urls':len(inventory),'compared':len(paths),
    'new_only_urls':len(new_only),'new_only_sample':new_only[:20],
    'failures':failures,'failure_count':len(failures),
    'timeouts_new':[p for p,r in results.items() if r['new'].get('error')],
    'results':results}
REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps({k:report[k] for k in ('old_sitemap_urls','new_sitemap_urls','compared','new_only_urls','failure_count','timeouts_new')},indent=2),flush=True)
print('saved',REPORT)
