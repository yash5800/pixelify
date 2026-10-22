/**
 * api/health.js — Vercel Serverless Function: Chopper readiness probe.
 *
 * GET  /api/health          → status of the function (no model load)
 * GET  /api/health?warm=1   → loads the model, then reports the status
 *
 * Used as the deploy gate: the function is only "ready" once the ONNX session
 * exists, which also proves the native addon and the weights are in place.
 */

import { getSession, getStatus, withModelWaitTimeout } from '../server/chopperModel.mjs';
import { sendJson } from '../server/httpBody.mjs';

export const config = {
  maxDuration: 300,
};

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader?.('allow', 'GET');
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const url = req.url || '/api/health';
  const wantsWarm = url.includes('warm=1');

  if (wantsWarm) {
    try {
      // Bounded so a slow weight download cannot outlive the function's own
      // timeout; the download keeps running in the background.
      await withModelWaitTimeout(getSession());
    } catch (error) {
      const warmingUp = error && error.code === 'model_warming_up';
      if (warmingUp) res.setHeader?.('retry-after', '30');
      sendJson(res, 503, {
        status: warmingUp ? 'warming_up' : 'unavailable',
        error: error instanceof Error ? error.message : 'Model could not be loaded.',
        ...getStatus(),
      });
      return;
    }
  }

  sendJson(res, 200, {
    status: 'ok',
    ...getStatus(),
  });
}
