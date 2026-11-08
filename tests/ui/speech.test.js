import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { speak } from '../../app/js/speech.js';

afterEach(() => {
  delete globalThis.AndroidBridge;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});

test('uses the Android bridge when present', () => {
  const calls = [];
  globalThis.AndroidBridge = { speak: (t) => calls.push(t) };
  assert.equal(speak('dog', { enabled: true }), true);
  assert.deepEqual(calls, ['dog']);
});

test('does nothing when sound is disabled', () => {
  const calls = [];
  globalThis.AndroidBridge = { speak: (t) => calls.push(t) };
  assert.equal(speak('dog', { enabled: false }), false);
  assert.deepEqual(calls, []);
});

test('falls back to speechSynthesis in English', () => {
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.speechSynthesis = { cancel() {}, speak: (u) => spoken.push(u) };
  assert.equal(speak('good morning', { enabled: true }), true);
  assert.equal(spoken[0].text, 'good morning');
  assert.equal(spoken[0].lang, 'en-US');
  assert.equal(spoken[0].rate, 0.9);
});

test('returns false without any speech engine, and never throws', () => {
  assert.equal(speak('dog', { enabled: true }), false);
  globalThis.AndroidBridge = { speak() { throw new Error('boom'); } };
  assert.equal(speak('dog', { enabled: true }), false);
});
