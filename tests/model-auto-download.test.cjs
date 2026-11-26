const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const modelCachePath = path.join(root, 'utils', 'modelCache.ts');
const compiled = ts.transpileModule(fs.readFileSync(modelCachePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: modelCachePath,
}).outputText;

/** Minimal localStorage shared between simulated page loads. */
function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

/** Loads the compiled model-cache module with browser APIs stubbed. */
function loadModelCache({ storage = createStorage(), cacheNames = [] } = {}) {
  const deletedCaches = [];
  const cacheEntries = new Map();
  const listeners = new Map();

  const caches = {
    keys: async () => [...cacheNames],
    delete: async (name) => {
      deletedCaches.push(name);
      return true;
    },
    open: async (name) => {
      if (!cacheEntries.has(name)) cacheEntries.set(name, new Set());
      const entries = cacheEntries.get(name);
      return {
        keys: async () => [...entries],
        delete: async (request) => entries.delete(request),
        match: async () => undefined,
      };
    },
  };

  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: (id) => {
      if (id === './runtime') return { RUNTIME_CACHE: 'ort-runtime' };
      throw new Error(`Unexpected require: ${id}`);
    },
    window: { localStorage: storage },
    caches,
    console,
    BroadcastChannel: undefined,
    URL,
  };

  vm.runInNewContext(compiled, context, { filename: modelCachePath });

  return {
    api: module.exports,
    storage,
    cacheEntries,
    deletedCaches,
    listeners,
  };
}

test('clearing models pauses automatic downloads until processing resumes', async () => {
  const { api, storage } = loadModelCache();

  assert.equal(api.isModelAutoDownloadSuppressed(), false);

  await api.clearDownloadedModelCaches();

  assert.equal(api.isModelAutoDownloadSuppressed(), true);
  assert.equal(storage.getItem('pixelify:models-cleared:v1'), '1');

  api.allowModelAutoDownload();

  assert.equal(api.isModelAutoDownloadSuppressed(), false);
  assert.equal(storage.getItem('pixelify:models-cleared:v1'), null);
});

test('the paused flag survives a reload so prefetch does not restart', () => {
  const storage = createStorage({ 'pixelify:models-cleared:v1': '1' });
  const { api } = loadModelCache({ storage });

  assert.equal(api.isModelAutoDownloadSuppressed(), true);

  api.allowModelAutoDownload();
  assert.equal(api.isModelAutoDownloadSuppressed(), false);
});

test('clearing still sweeps model weights out of caches it keeps', async () => {
  const storage = createStorage();
  const { api, cacheEntries } = loadModelCache({ storage, cacheNames: ['pixelify-cache-v3'] });
  const appShell = cacheEntries.get('pixelify-cache-v3') || new Set();
  cacheEntries.set('pixelify-cache-v3', appShell);

  const modelRequest = new Request('https://pixelify.test/models/chopper.onnx');
  const assetRequest = new Request('https://pixelify.test/_next/static/app.js');
  appShell.add(modelRequest);
  appShell.add(assetRequest);

  await api.clearDownloadedModelCaches();

  assert.equal(appShell.has(modelRequest), false);
  assert.equal(appShell.has(assetRequest), true);
});

test('automatic preload paths are gated and processing paths lift the pause', () => {
  const appProvider = fs.readFileSync(path.join(root, 'components', 'AppProvider.tsx'), 'utf8');
  const bgWorkspace = fs.readFileSync(path.join(root, 'components', 'BGRemoveWorkspace.tsx'), 'utf8');
  const bgView = fs.readFileSync(path.join(root, 'components', 'views', 'BgRemoveView.tsx'), 'utf8');

  // Route/idle preload, hover warmup and manual model change all bail out.
  assert.match(appProvider, /if \(isModelAutoDownloadSuppressed\(\)\) return;/);
  // Upload preload is skipped, but the file is still added to the workspace.
  assert.match(appProvider, /if \(!isModelAutoDownloadSuppressed\(\)\) \{\s*void loadModel\('vitality'/);
  // The explicit upscale action resumes normal loading.
  assert.match(appProvider, /allowModelAutoDownload\(\);\s*if \(!sessionRef\.current/);
  // BG route init is skipped after a clear; processing resumes downloads.
  assert.match(bgWorkspace, /if \(!isModelAutoDownloadSuppressed\(\)\) \{\s*void bgRemoverService\.init\(\);/);
  assert.match(bgWorkspace, /async function processJob[\s\S]*?allowModelAutoDownload\(\);/);
  // The engine callback must be stable or the init effect re-runs on render.
  assert.match(bgView, /onEngineReport=\{handleEngineReport\}/);
  assert.match(bgView, /const handleEngineReport = useCallback/);
});
