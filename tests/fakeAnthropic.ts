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
      requests.push({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') });
      const page = queue.shift() ?? samplePage();
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: `msg_${requests.length}`,
            type: 'message',
            role: 'assistant',
            model: 'claude-opus-5-5',
            content: [{ type: 'text', text: JSON.stringify(page) }],
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
        );
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
