import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import * as publishingRoute from './publishing/[...path]';
import * as mediaRoute from './publishing/media';
import { authenticate, apiResponse } from '../../lib/publishing/api';

const tools = [
  { name:'search_articles', description:'Search AnimeSparks drafts and published articles. Check intent overlap before drafting.', inputSchema:{type:'object',properties:{q:{type:'string'},language:{type:'string',enum:['en','es']},state:{type:'string',enum:['draft','published']},limit:{type:'integer',maximum:100}}} },
  { name:'get_article', description:'Retrieve a complete article by AnimeSparks ID or slug.', inputSchema:{type:'object',required:['id'],properties:{id:{type:'string'}}} },
  { name:'get_taxonomy', description:'List existing AnimeSparks categories and authors.', inputSchema:{type:'object',properties:{}} },
  { name:'create_draft', description:'Create a validated draft article. Requires an Idempotency-Key.', inputSchema:{type:'object',required:['article','idempotencyKey'],properties:{article:{type:'object'},idempotencyKey:{type:'string'}}} },
  { name:'update_draft', description:'Update an existing draft article by ID.', inputSchema:{type:'object',required:['id','article'],properties:{id:{type:'string'},article:{type:'object'}}} },
  { name:'upload_image', description:'Upload an image you have permission to publish to the existing R2 bucket.', inputSchema:{type:'object',required:['imageBase64','mimeType','rightsConfirmed'],properties:{imageBase64:{type:'string',maxLength:14000000},mimeType:{type:'string',enum:['image/jpeg','image/png','image/webp','image/avif','image/gif']},rightsConfirmed:{type:'boolean',const:true}}} },
  { name:'publish_article', description:'Publish a validated article and queue a serialized production build.', inputSchema:{type:'object',required:['id'],properties:{id:{type:'string'}}} },
  { name:'request_rebuild', description:'Queue a production site rebuild after meaningful content changes.', inputSchema:{type:'object',properties:{}} },
  { name:'publication_status', description:'Check saved content and recent static deployment job status.', inputSchema:{type:'object',properties:{}} },
];
const toolRoute: Record<string,string> = { search_articles:'articles', get_article:'articles', get_taxonomy:'taxonomy', create_draft:'articles', update_draft:'articles', upload_image:'media', publish_article:'articles', request_rebuild:'rebuild', publication_status:'status' };
export const POST: APIRoute = async ({ request }) => {
  if (!await authenticate(request, env.PUBLISHING_API_KEY)) return apiResponse({ error:'Unauthorized' },401);
  let rpc: { id?: string | number; method?: string; params?: { name?: string; arguments?: Record<string,unknown> } };
  try {
    const raw = await request.text();
    if (raw.length > 14_500_000) return apiResponse({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Request too large'}} ,413);
    rpc = JSON.parse(raw);
  } catch { return apiResponse({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}} ,400); }
  if (!rpc.method?.startsWith('notifications/')) {
    if (rpc.method === 'initialize') return apiResponse({jsonrpc:'2.0',id:rpc.id,result:{protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'animesparks-publishing',version:'1.0.0'}}});
    if (rpc.method === 'ping') return apiResponse({jsonrpc:'2.0',id:rpc.id,result:{}});
    if (rpc.method === 'tools/list') return apiResponse({jsonrpc:'2.0',id:rpc.id,result:{tools}});
    if (rpc.method === 'tools/call') {
      const name = rpc.params?.name || '', args = rpc.params?.arguments || {};
      const path = toolRoute[name];
      if (!path) return apiResponse({jsonrpc:'2.0',id:rpc.id,error:{code:-32602,message:'Unknown tool'}} ,400);
      const method = ['search_articles','get_article','get_taxonomy','publication_status'].includes(name) ? 'GET' : name === 'update_draft' ? 'PATCH' : 'POST';
      if (name === 'upload_image') {
        try {
          if (args.rightsConfirmed !== true || typeof args.imageBase64 !== 'string' || args.imageBase64.length > 14_000_000 || typeof args.mimeType !== 'string') throw new Error('Confirm image rights and provide an image under 10 MB.');
          const binary = atob(args.imageBase64), bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
          if (bytes.byteLength > 10_000_000) throw new Error('Image exceeds 10 MB.');
          const form = new FormData(); form.set('rightsConfirmed','true'); form.set('file',new File([bytes],`upload.${args.mimeType.split('/')[1]}`,{type:args.mimeType}));
          const response = await mediaRoute.POST({request:new Request(new URL('/api/publishing/media',request.url),{method:'POST',headers:request.headers,body:form})} as never);
          const text = await response.text();
          return apiResponse({jsonrpc:'2.0',id:rpc.id,result:{content:[{type:'text',text}],isError:!response.ok}});
        } catch (error) { return apiResponse({jsonrpc:'2.0',id:rpc.id,result:{content:[{type:'text',text:JSON.stringify({error:error instanceof Error?error.message:'Image upload failed.'})}],isError:true}}); }
      }
      const suffix = name === 'get_article' || name === 'update_draft' ? `/${encodeURIComponent(String(args.id || ''))}` : name === 'publish_article' ? `/${encodeURIComponent(String(args.id || ''))}/publish` : '';
      const url = new URL(`/api/publishing/${path}${suffix}`, request.url);
      if (method === 'GET') for (const k of ['q','language','state','limit']) if (args[k] !== undefined) url.searchParams.set(k,String(args[k]));
      const payload = name === 'create_draft' ? args.article : name === 'update_draft' ? args.article : args;
      const headers = new Headers(request.headers);
      if (name === 'create_draft') headers.set('idempotency-key',String(args.idempotencyKey || ''));
      const proxied = new Request(url, {method,headers,body:method === 'GET' ? undefined : JSON.stringify(payload)});
      const response = await publishingRoute.ALL({request:proxied,params:{path:path + suffix}} as never);
      const text = await response.text();
      return apiResponse({jsonrpc:'2.0',id:rpc.id,result:{content:[{type:'text',text}],isError:!response.ok}});
    }
    return apiResponse({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method not found'}} ,400);
  }
  return new Response(null,{status:202});
};
