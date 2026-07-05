import assert from 'node:assert/strict';
import {
  captionSegmentsToTranscript,
  captionSegmentsToLegacySegments,
  distributeWordsEvenly,
  fromApiCaptionSegments,
  getActiveCaptionWordIndex,
  parseCaptionSegmentsFromTranscript,
  updateCaptionWordTiming,
} from '../packages/shared/src/studio/captionSegments.ts';

function testRoundTripTranscript() {
  const input = `[00:00-00:03] Speaker 1: Hello world
[00:03-00:06] Speaker 1: Second line`;
  const parsed = parseCaptionSegmentsFromTranscript(input);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]!.words?.length, 2);
  const rebuilt = captionSegmentsToTranscript(parsed);
  assert.match(rebuilt, /Hello world/);
  console.log('✓ caption transcript round-trip');
}

function testApiSegmentsWithWords() {
  const segments = fromApiCaptionSegments([
    {
      startSec: 0,
      endSec: 2,
      text: 'Hello world',
      speakerId: 'Speaker 1',
      words: [
        { text: 'Hello', startSec: 0, endSec: 0.8 },
        { text: 'world', startSec: 0.8, endSec: 1.5 },
      ],
    },
  ]);
  assert.equal(segments.length, 1);
  assert.equal(segments[0]!.words?.length, 2);
  const legacy = captionSegmentsToLegacySegments(segments);
  assert.equal(legacy[0]!.endTime, 2);
  console.log('✓ API caption segments preserve words');
}

function testEvenWordDistribution() {
  const words = distributeWordsEvenly('one two three', 1, 4);
  assert.equal(words.length, 3);
  assert.equal(words[0]!.startSec, 1);
  assert.ok(words[2]!.endSec <= 4.01);
  console.log('✓ even word distribution fallback');
}

function testUpdateWordTiming() {
  const base = fromApiCaptionSegments([
    {
      startSec: 0,
      endSec: 2,
      text: 'Hello world',
      speakerId: 'Speaker 1',
      words: [
        { text: 'Hello', startSec: 0, endSec: 0.8 },
        { text: 'world', startSec: 0.8, endSec: 1.5 },
      ],
    },
  ]);
  const updated = updateCaptionWordTiming(base, 0, 1, { endSec: 1.9 });
  assert.equal(updated[0]!.words?.[1]?.endSec, 1.9);
  assert.equal(updated[0]!.endSec, 1.9);
  console.log('✓ update word timing');
}

function testActiveWordIndex() {
  const words = distributeWordsEvenly('alpha beta', 0, 2);
  assert.equal(getActiveCaptionWordIndex(words, 0.2), 0);
  assert.equal(getActiveCaptionWordIndex(words, 1.5), 1);
  console.log('✓ active word index');
}

testRoundTripTranscript();
testApiSegmentsWithWords();
testEvenWordDistribution();
testUpdateWordTiming();
testActiveWordIndex();
console.log('\nAll caption segment tests passed.');
