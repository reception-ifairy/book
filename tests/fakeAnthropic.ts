import http from 'http';
import type { AddressInfo } from 'net';

/** A page as the story model would return it; tests override fields per call. */
export const samplePage = (over: Record<string, unknown> = {}) => ({
  narration: 'You step onto the *encrypted path*.',
  ignis_quip: 'Bold. Wrong, but bold.',
  mood: 'smug',
  choices: [
    { label: 'Stay on the path', kind: 'sane' },
    { label: 'Hack the wolf', kind: 'chaos' },
    { label: 'Give the wolf your password', kind: 'dumb' },
    { label: 'sudo rm -rf /wolf', kind: 'sudo' },
  ],
  stat_changes: { chaos: 10, karma: 0, mana: 0 },
  canon_delta: -5,
  inventory_add: ['firewall.spell'],
  inventory_remove: [],
  ending: null,
  image_prompt: 'A courier in a red hood',
  story_summary: 'The courier set off.',
  artifact_description: null,
  ...over,
});

/**
 * Minimal stand-in for the Anthropic Messages API. Each request pops the next queued page
 * (or repeats samplePage) and is recorded so tests can assert what was sent.
 */
export async function startFakeAnthropic() {
  const queue: Record<string, unknown>[] = [];
  const requests: any[] = [];
  let delayMs = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url?.startsWith('/v1/models')) {
        // Model listing (the admin key test) must not consume queued pages.
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ type: 'model', id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5', created_at: '2026-01-01T00:00:00Z' }], has_more: false, first_id: 'claude-opus-5-5', last_id: 'claude-opus-5-5' }));
      }
      requests.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
      const page = queue.shift() ?? samplePage();
      const message = {
        id: `msg_${requests.length}`,
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(page) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      };
      setTimeout(() => {
        if (!JSON.parse(body || '{}').stream) {
          res.writeHead(200, { 'content-type': 'application/json' });
          return res.end(JSON.stringify(message));
        }
        // Server-sent events, as the SDK's .stream() expects.
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const send = (type: string, data: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
        send('message_start', { message: { ...message, content: [], stop_reason: null } });
        send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
        send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: message.content[0].text } });
        send('content_block_stop', { index: 0 });
        send('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } });
        send('message_stop', {});
        res.end();
      }, delayMs);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    enqueue: (...pages: Record<string, unknown>[]) => queue.push(...pages),
    setDelay: (ms: number) => (delayMs = ms),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
