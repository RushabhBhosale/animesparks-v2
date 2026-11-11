import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider } from './types';

/**
 * AI is optional everywhere in the CMS: every caller has a deterministic path and only
 * consults a provider when one is configured. Adapters implement `AiProvider`.
 *
 *   AI_TEXT_PROVIDER=anthropic   ANTHROPIC_API_KEY=…   AI_TEXT_MODEL=claude-opus-5-5 (default)
 *   AI_IMAGE_PROVIDER=openai     AI_IMAGE_API_KEY=…    AI_IMAGE_MODEL=gpt-image-1   AI_IMAGE_BASE_URL (optional)
 */
export function aiFromEnv(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch): AiProvider | undefined {
  const provider: AiProvider = {};
  if (env.AI_TEXT_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) provider.text = anthropicText(env.ANTHROPIC_API_KEY, env.AI_TEXT_MODEL || 'claude-opus-5-5');
  if (env.AI_IMAGE_PROVIDER === 'openai' && env.AI_IMAGE_API_KEY) provider.image = openAiImage(env.AI_IMAGE_API_KEY, env.AI_IMAGE_MODEL || 'gpt-image-1', env.AI_IMAGE_BASE_URL || 'https://api.openai.com/v1', fetcher);
  return provider.text || provider.image ? provider : undefined;
}

const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-2', 'claude-fable-5-1']);
function anthropicText(apiKey: string, model: string): NonNullable<AiProvider['text']> {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  return async (prompt, maxTokens = 2000) => {
    const base = { model, max_tokens: maxTokens, output_config: { effort: 'low' as const }, messages: [{ role: 'user' as const, content: prompt }] };
    // Server-side refusal fallback is on for the models that support it, so a declined request is retried on a fallback model.
    const response = FALLBACK_MODELS.has(model)
      ? await client.beta.messages.create({ ...base, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as never) as unknown as Anthropic.Message
      : await client.messages.create(base);
    if (response.stop_reason === 'refusal') throw new Error('AI provider declined the request.');
    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('').trim();
    if (!text) throw new Error(`AI provider returned no text (stop_reason: ${response.stop_reason}).`);
    return text;
  };
}

/** Original image generation (not a Claude capability), used only when a project enables it. */
function openAiImage(apiKey: string, model: string, baseUrl: string, fetcher: typeof fetch): NonNullable<AiProvider['image']> {
  return async (prompt, size) => {
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, n: 1, size: size.width >= size.height * 1.3 ? '1536x1024' : '1024x1024' }),
    });
    if (!response.ok) throw new Error(`Image generation failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    const data = (await response.json() as { data?: Array<{ b64_json?: string; url?: string }> }).data?.[0];
    if (data?.b64_json) return Uint8Array.from(atob(data.b64_json), c => c.charCodeAt(0));
    if (data?.url) return new Uint8Array(await (await fetcher(data.url)).arrayBuffer());
    throw new Error('Image generation returned no image.');
  };
}
