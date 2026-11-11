import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Ctx } from '../core/types';
import { buildMcpServer } from './server';

/** Stateless Streamable HTTP: one server per request, so it runs on Node and on edge workers alike. */
export async function handleMcp(ctx: Ctx, request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST.' } }), { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } });
  const server = buildMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
