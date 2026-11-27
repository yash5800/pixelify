const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const workspace = fs.readFileSync(path.join(root, 'components', 'BGRemoveWorkspace.tsx'), 'utf8');

/** The `processJob` body, so assertions cannot accidentally match other functions. */
function processJobSource() {
  const start = workspace.indexOf('async function processJob');
  assert.notEqual(start, -1, 'processJob should exist');
  const end = workspace.indexOf('const handleModelSwitch', start);
  assert.notEqual(end, -1, 'processJob should end before handleModelSwitch');
  return workspace.slice(start, end);
}

test('processing progress is armed only by the worker inference stage', () => {
  const body = processJobSource();

  // Exactly one call site for startProcessing(), and it is the running-inference
  // handler. Nothing may fabricate processing progress from download or init state.
  const calls = [...body.matchAll(/startProcessing\(\)/g)];
  assert.equal(calls.length, 1, 'startProcessing should have exactly one call site');
  assert.match(
    body,
    /else if \(stage === 'running-inference'\) \{\s*startProcessing\(\);/,
    'startProcessing must be armed by the running-inference stage'
  );
});

test('the download phase owns the pill until inference actually starts', () => {
  const body = processJobSource();

  // While weights transfer, non-inference stages must not break out of loading.
  assert.match(
    body,
    /if \(downloadingModel && !inferenceStarted\s*&& stage !== 'running-inference' && stage !== 'encoding-output'\) \{\s*return;/,
    'download phase must suppress loading/inference stage overrides'
  );

  // A late duplicate weight tick after inference started must not yank the pill
  // back to "Downloading".
  assert.match(
    body,
    /if \(inferenceStarted\) return;/,
    'late weight ticks must be ignored once inference started'
  );

  // The loading phase never renders as processing.
  const weightTick = body.slice(body.indexOf('const rawPct'), body.indexOf('(stage, msg) =>'));
  assert.match(weightTick, /status: 'loading'/, 'weight progress must stay in the loading phase');
  assert.doesNotMatch(weightTick, /status: 'processing'/, 'weight progress must not claim processing');
});

test('the processing ticker approaches 99% and never claims 100% on its own', () => {
  const body = processJobSource();

  assert.match(
    body,
    /currentProgress = Math\.min\(99, currentProgress \+ increment\)/,
    'ticker must cap at 99%'
  );
  assert.match(
    body,
    /increment = Math\.max\(0\.05, \(99 - currentProgress\)/,
    'ticker must asymptotically approach 99% instead of freezing'
  );
  // Strip comments so the explanatory note about the removed 88% cap does not
  // count as live code.
  const codeOnly = body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(codeOnly, /\b88\b/, 'the old 88% cap must be gone');
});

test('100% is claimed only after the worker returns the final blob', () => {
  const body = processJobSource();

  const awaitIndex = body.indexOf('await bgRemoverService.removeBackground');
  const completeIndex = body.indexOf("message: 'Cutout complete!'");
  assert.notEqual(awaitIndex, -1, 'removeBackground await should exist');
  assert.notEqual(completeIndex, -1, 'completion update should exist');
  assert.ok(completeIndex > awaitIndex, '100% must be set after the worker resolves');

  const completion = body.slice(completeIndex - 120, completeIndex + 40);
  assert.match(completion, /progress: 100/, 'completion must report 100%');

  // The 100% state is held briefly so the user can read it before status: 'done'.
  assert.match(
    body,
    /message: 'Cutout complete!',\s*\}\);\s*await new Promise\(\(r\) => setTimeout\(r, 350\)\);/,
    'completion must hold before flipping to done'
  );
});
