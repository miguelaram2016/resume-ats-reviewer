import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodePlainTextResume } from '../lib/plainTextResume.ts';

const bytes = (s) => new TextEncoder().encode(s).buffer;

test('preserves UTF-8 and newlines', () => {
  assert.equal(decodePlainTextResume(bytes('Skills\n• Leadership\n')), 'Skills\n• Leadership');
});
test('removes byte order mark', () => {
  assert.equal(decodePlainTextResume(bytes('\uFEFFHello')), 'Hello');
});
test('rejects empty text', () => {
  assert.equal(decodePlainTextResume(bytes('   ')), null);
});
test('rejects control bytes', () => {
  assert.equal(decodePlainTextResume(new Uint8Array([65, 0, 66]).buffer), null);
});
test('rejects invalid UTF-8', () => {
  assert.equal(decodePlainTextResume(new Uint8Array([0xC3, 0x28]).buffer), null);
});
