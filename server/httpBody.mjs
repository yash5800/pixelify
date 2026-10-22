/**
 * httpBody.mjs — tiny helpers shared by the Vercel functions.
 *
 * The functions are written against the plain Node http API so they can be
 * mounted in a local `http.createServer` (scripts/chopper-serve.mjs) exactly
 * the way Vercel mounts them.
 */

/** Read the raw request body (Buffer) from a Vercel request or a plain one. */
export async function readRequestBody(req) {
  const pre = req.body;
  if (pre && typeof pre === 'object' && typeof pre.length === 'number' && !pre.readable) {
    return Buffer.isBuffer(pre) ? pre : Buffer.from(pre);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

export function sendBinary(res, status, buffer, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/octet-stream',
    'content-length': buffer.length,
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(buffer);
}
