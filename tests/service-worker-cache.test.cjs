const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('service worker activation preserves AI model caches', async () => {
  const listeners = new Map();
  const deleted = [];
  const context = {
    self: {
      addEventListener: (type, listener) => listeners.set(type, listener),
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
    },
    caches: {
      keys: async () => [
        'pixelify-cache-v1',
        'pixelify-cache-v2',
        'litert-upscaler-models-v2',
        'onnx-models',
      ],
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({ addAll: async () => {}, put: async () => {}, match: async () => null }),
      match: async () => null,
    },
    fetch: async () => ({ status: 200, clone: () => ({}) }),
    URL,
    Request,
    Response,
    console,
  };

  const serviceWorkerPath = path.join(__dirname, '..', 'public', 'sw.js');
  vm.runInNewContext(fs.readFileSync(serviceWorkerPath, 'utf8'), context, { filename: serviceWorkerPath });

  let activation;
  listeners.get('activate')({ waitUntil: (promise) => { activation = promise; } });
  await activation;

  assert.deepEqual(deleted, ['pixelify-cache-v1']);
});
