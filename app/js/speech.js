// Speaks English words: Android TextToSpeech bridge in the APK, Web Speech elsewhere. Never throws.
export function speak(text, { enabled = true } = {}) {
  if (!enabled || !text) return false;
  try {
    if (globalThis.AndroidBridge?.speak) {
      globalThis.AndroidBridge.speak(text);
      return true;
    }
    const synth = globalThis.speechSynthesis;
    const Utterance = globalThis.SpeechSynthesisUtterance;
    if (synth && Utterance) {
      const u = new Utterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      synth.cancel();
      synth.speak(u);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
