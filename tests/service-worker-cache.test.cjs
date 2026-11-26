const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const serviceWorkerPath = path.join(__dirname, '..', 'public', 'sw.js');

/** Runs public/sw.js in a VM and returns its registered event listeners. */
function loadServiceWorker(overrides = {}) {
  const listeners = new Map();
  const context = {
    self: {
      addEventListener: (type, listener) => listeners.set(type, listener),
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
    },
    caches: {
      keys: async () => [],
      delete: async () => true,
      open: async () => ({
        addAll: async () => {},
        put: async () => {},
        match: async () => null,
        keys: async () => [],
        delete: async () => true,
      }),
      match: async () => null,
    },
    fetch: async () => ({ status: 200, clone: () => ({}) }),
    URL,
    Request,
    Response,
    console,
    ...overrides,
  };

  vm.runInNewContext(fs.readFileSync(serviceWorkerPath, 'utf8'), context, { filename: serviceWorkerPath });
  return { listeners, context };
}

test('service worker activation retires old app-shell caches but preserves AI model caches', async () => {
  const deleted = [];
  const { listeners } = loadServiceWorker({
    caches: {
      keys: async () => [
        'pixelify-cache-v1',
        'pixelify-cache-v2',
        'pixelify-cache-v3',
        'pixelify-cache-v4',
        'litert-upscaler-models-v2',
        'onnx-models',
      ],
      delete: async (name) => { deleted.push(name); return true; },
      open: async () => ({ addAll: async () => {}, put: async () => {}, match: async () => null }),
      match: async () => null,
    },
  });

  let activation;
  listeners.get('activate')({ waitUntil: (promise) => { activation = promise; } });
  await activation;

  assert.deepEqual(deleted, ['pixelify-cache-v1', 'pixelify-cache-v2', 'pixelify-cache-v3']);
});

test('service worker never caches dynamic API responses', () => {
  const { listeners } = loadServiceWorker();
  const apiUrls = [
    'https://pixelify.test/api/leaderboard?period=all',
    'https://pixelify.test/api/leaderboard?period=week',
    'https://pixelify.test/api/activity?type=all&period=all&page=1',
    'https://pixelify.test/api/identity',
  ];

  for (const url of apiUrls) {
    let handled = false;
    listeners.get('fetch')({
      request: new Request(url),
      respondWith: () => { handled = true; },
    });
    assert.equal(
      handled,
      false,
      `${url} must go to the network so the leaderboard never renders stale rankings`,
    );
  }
});

test('service worker never intercepts model weight requests', () => {
  const { listeners } = loadServiceWorker();
  const modelUrls = [
    'https://pixelify.test/models/Vitality.tflite?litert=fixed-tile-webgpu-v3',
    'https://pixelify.test/models/chopper.onnx',
    'https://huggingface.co/Joker5800/pixelify/resolve/main/Diablo.onnx',
    'https://huggingface.co/Joker5800/pixelify/resolve/main/model.onnx_data',
  ];

  for (const url of modelUrls) {
    let handled = false;
    listeners.get('fetch')({
      request: new Request(url),
      respondWith: () => { handled = true; },
    });
    assert.equal(
      handled,
      false,
      `${url} must bypass the service worker so "Clear downloaded models" can force a re-download`,
    );
  }
});

test('service worker still serves non-model assets', () => {
  const { listeners } = loadServiceWorker();
  let handled = false;

  listeners.get('fetch')({
    request: new Request('https://pixelify.test/_next/static/chunks/app.js'),
    respondWith: () => { handled = true; },
  });

  assert.equal(handled, true, 'app shell and static assets should still use the SW cache');
});
