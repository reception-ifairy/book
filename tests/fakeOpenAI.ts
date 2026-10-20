import http from 'http';
import type { AddressInfo } from 'net';

/** 1x1 transparent PNG. */
export const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** Stand-in for OpenAI image generation; records every request, can be told to fail a prompt. */
export async function startFakeOpenAI() {
  const requests: any[] = [];
  let failWhen: RegExp | null = null;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const json = JSON.parse(body || '{}');
      requests.push({ url: req.url, body: json });
      if (failWhen?.test(json.prompt ?? '')) {
        res.writeHead(400, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Your request was rejected by the safety system.', type: 'invalid_request_error' } }));
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ created: 1, data: [{ b64_json: TINY_PNG }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`,
    requests,
    failWhen: (re: RegExp | null) => (failWhen = re),
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
