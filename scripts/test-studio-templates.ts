import assert from 'node:assert/strict';
import { applyStudioTemplate } from '../packages/shared/src/studio/applyStudioTemplate.ts';
import {
  getStudioTemplate,
  STUDIO_TEMPLATES,
} from '../packages/shared/src/constants/studioTemplates.ts';

function testQuoteCardNoSlots() {
  const template = getStudioTemplate('quote-card');
  assert.ok(template, 'quote-card template exists');
  const applied = applyStudioTemplate(template!);
  assert.equal(applied.canvasElements.length, 2);
  assert.equal(applied.videoClips.length, 0);
  assert.equal(applied.unfilledSlotIds.length, 0);
  assert.equal(applied.duration, 10);
  assert.equal(applied.aspectRatio, '1:1');
  console.log('✓ quote-card applies text-only layout');
}

function testReelsHookUnfilledVideoSlot() {
  const template = getStudioTemplate('reels-hook');
  assert.ok(template);
  const applied = applyStudioTemplate(template!);
  assert.equal(applied.canvasElements.length, 2);
  assert.equal(applied.videoClips.length, 0);
  assert.deepEqual(applied.unfilledSlotIds, ['primary-video']);
  console.log('✓ reels-hook lists unfilled primary-video slot');
}

function testReelsHookWithVideoBinding() {
  const template = getStudioTemplate('reels-hook');
  assert.ok(template);
  const applied = applyStudioTemplate(template!, [
    { slotId: 'primary-video', name: 'clip.mp4', duration: 20 },
  ]);
  assert.equal(applied.videoClips.length, 1);
  assert.equal(applied.videoClips[0]!.duration, 15);
  assert.equal(applied.videoClips[0]!.name, 'clip.mp4');
  assert.equal(applied.unfilledSlotIds.length, 0);
  console.log('✓ reels-hook binds primary video slot');
}

function testAllTemplatesApply() {
  for (const template of STUDIO_TEMPLATES) {
    const applied = applyStudioTemplate(template);
    assert.ok(applied.duration > 0);
    assert.ok(applied.canvasElements.length > 0 || applied.videoClips.length > 0);
  }
  console.log(`✓ all ${STUDIO_TEMPLATES.length} templates apply without error`);
}

testQuoteCardNoSlots();
testReelsHookUnfilledVideoSlot();
testReelsHookWithVideoBinding();
testAllTemplatesApply();
console.log('\nAll studio template tests passed.');
