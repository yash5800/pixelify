/**
 * api/bg-remove.js — Vercel Serverless Function: Chopper on the server.
 *
 * Contract (chosen so both payloads stay far below Vercel's 4.5 MB body cap):
 *
 *   POST /api/bg-remove
 *     request  : raw RGB bytes, 512 x 512 x 3 = 786 432 bytes
 *                (content-type: application/octet-stream)
 *     response : raw alpha mask, 512 x 512 = 262 144 bytes
 *                (content-type: application/octet-stream)
 *
 * The browser composites the mask over the original pixels locally, so the
 * full-resolution photo never leaves the device and the cutout keeps its
 * original resolution.
 */

import { computeMask, getStatus, INPUT_SIZE, RGB_BYTES, withModelWaitTimeout } from '../server/chopperModel.mjs';
import { readRequestBody, sendBinary, sendJson } from '../server/httpBody.mjs';

export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

  if (method !== 'POST') {
    res.setHeader?.('allow', 'POST');
    sendJson(res, 405, {
      error: 'method_not_allowed',
      message: 'Use POST with a raw 512x512 RGB body.',
    });
    return;
  }

  const startedAt = Date.now();
  let body;
  try {
    body = await readRequestBody(req);
  } catch (error) {
    sendJson(res, 400, {
      error: 'invalid_body',
      message: error instanceof Error ? error.message : 'Could not read the request body.',
    });
    return;
  }

  if (!body || body.length !== RGB_BYTES) {
    sendJson(res, 400, {
      error: 'invalid_size',
      message: `Expected ${RGB_BYTES} bytes of RGB data, received ${body ? body.length : 0}.`,
    });
    return;
  }

  try {
    const mask = await withModelWaitTimeout(computeMask(body));
    sendBinary(res, 200, Buffer.from(mask.buffer, mask.byteOffset, mask.length), {
      'x-chopper-width': String(INPUT_SIZE),
      'x-chopper-height': String(INPUT_SIZE),
      'x-chopper-ms': String(Date.now() - startedAt),
      'x-chopper-model': 'studioludens/birefnet-lite-512',
    });
  } catch (error) {
    // The model is still being downloaded on a fresh instance: the download
    // keeps running, so the next request finds a warm model.
    if (error && error.code === 'model_warming_up') {
      res.setHeader?.('retry-after', '30');
      sendJson(res, 503, {
        error: 'model_warming_up',
        message: error.message,
        ...getStatus(),
      });
      return;
    }
    sendJson(res, 500, {
      error: 'inference_failed',
      message: error instanceof Error ? error.message : 'Background removal failed.',
      ...getStatus(),
    });
  }
}
