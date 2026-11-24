const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const sourceDir = path.join(root, 'node_modules', '@litertjs', 'core', 'wasm');
const publicDir = path.join(root, 'public', 'litert', 'wasm');

test('LiteRT public runtime assets stay in sync with the installed package', () => {
  const copy = spawnSync(process.execPath, ['scripts/copy-litert.js'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(copy.status, 0, copy.stderr || copy.stdout);

  for (const file of fs.readdirSync(sourceDir)) {
    assert.deepEqual(
      fs.readFileSync(path.join(publicDir, file)),
      fs.readFileSync(path.join(sourceDir, file)),
      `${file} should be refreshed from the installed LiteRT package`,
    );
  }

  const loaders = fs.readdirSync(publicDir).filter((file) => file.endsWith('.js'));
  for (const file of loaders) {
    const source = fs.readFileSync(path.join(publicDir, file), 'utf8');
    assert.equal(source.includes('huggingface.co/Joker5800/pixelify'), false, `${file} must not contain the old remote fallback`);
  }
});
