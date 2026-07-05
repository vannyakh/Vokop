import assert from 'node:assert/strict';
import {
  buildXfadeChain,
  resolveXfadeName,
  transitionsBetweenClips,
  areSequentialClips,
} from '../packages/pipeline/src/xfade.ts';

function testResolveXfade() {
  assert.equal(resolveXfadeName('dissolve'), 'fade');
  assert.equal(resolveXfadeName('fade'), 'fadeblack');
  assert.equal(resolveXfadeName('cut'), null);
  console.log('✓ resolve xfade preset names');
}

function testSequentialClips() {
  const ok = areSequentialClips([
    { id: 'a', startSec: 0, durationSec: 5 },
    { id: 'b', startSec: 5, durationSec: 4 },
  ]);
  assert.equal(ok, true);
  const gap = areSequentialClips([
    { id: 'a', startSec: 0, durationSec: 5 },
    { id: 'b', startSec: 6, durationSec: 4 },
  ]);
  assert.equal(gap, false);
  console.log('✓ sequential clip detection');
}

function testBuildXfadeChain() {
  const result = buildXfadeChain({
    clipLabels: ['v0', 'v1'],
    clipDurations: [5, 4],
    transitions: [
      {
        outgoingClipId: 'a',
        incomingClipId: 'b',
        presetId: 'dissolve',
        durationSec: 0.5,
      },
    ],
  });
  assert.equal(result.outputLabel, 'xf0');
  assert.equal(result.outputDurationSec, 8.5);
  assert.match(result.filters[0]!, /xfade=transition=fade:duration=0.5:offset=4.5/);
  console.log('✓ build xfade chain with dissolve');
}

function testBuildCutConcat() {
  const result = buildXfadeChain({
    clipLabels: ['v0', 'v1', 'v2'],
    clipDurations: [3, 2, 4],
    transitions: [null, null],
  });
  assert.equal(result.filters.length, 2);
  assert.match(result.filters[0]!, /concat=n=2:v=1:a=0/);
  assert.equal(result.outputDurationSec, 9);
  console.log('✓ build concat chain for cuts');
}

function testTransitionsBetweenClips() {
  const mapped = transitionsBetweenClips(['a', 'b', 'c'], [
    {
      outgoingClipId: 'a',
      incomingClipId: 'b',
      presetId: 'wipe-left',
      durationSec: 0.4,
    },
  ]);
  assert.equal(mapped.length, 2);
  assert.equal(mapped[0]?.presetId, 'wipe-left');
  assert.equal(mapped[1], null);
  console.log('✓ map transitions to clip pairs');
}

testResolveXfade();
testSequentialClips();
testBuildXfadeChain();
testBuildCutConcat();
testTransitionsBetweenClips();
console.log('\nAll xfade builder tests passed.');
