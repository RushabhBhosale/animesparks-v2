// Local MCP server over stdio: `CMS_API_TOKEN=cms_… npm run mcp` (token created in Project Settings → API tokens).
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { actorFromToken } from '../core/auth';
import { createNodeRuntime } from '../server/runtime-node';
import { buildMcpServer } from './server';

const runtime = await createNodeRuntime();
const actor = await actorFromToken(runtime.base.db, runtime.env.CMS_API_TOKEN);
if (!actor) { console.error('CMS_API_TOKEN is missing or invalid. Create a token in Project Settings → API tokens.'); process.exit(1); }
await buildMcpServer({ ...runtime.base, actor }).connect(new StdioServerTransport());
