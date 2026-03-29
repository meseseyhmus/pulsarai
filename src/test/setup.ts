import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ── Web Speech API mock ──────────────────────────────────────────
class MockSpeechRecognition {
  lang = 'tr-TR';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  addEventListener() {}
  removeEventListener() {}
}
vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);

// ── SpeechSynthesis mock ─────────────────────────────────────────
vi.stubGlobal('speechSynthesis', {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

// ── AudioContext mock ────────────────────────────────────────────
vi.stubGlobal('AudioContext', class {
  destination = { setSinkId: vi.fn() };
  currentTime = 0;
  createAnalyser() {
    return {
      fftSize: 256,
      frequencyBinCount: 128,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn((arr: Uint8Array) => arr.fill(0)),
    };
  }
  createMediaStreamSource() { return { connect: vi.fn() }; }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
  close() { return Promise.resolve(); }
});

// ── navigator.mediaDevices mock ──────────────────────────────────
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      { deviceId: 'mic1', label: 'Test Mikrofon 1', kind: 'audioinput', groupId: '', toJSON: () => ({}) },
      { deviceId: 'mic2', label: 'Test Mikrofon 2', kind: 'audioinput', groupId: '', toJSON: () => ({}) },
      { deviceId: 'spk1', label: 'Test Hoparlör 1', kind: 'audiooutput', groupId: '', toJSON: () => ({}) },
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// ── localStorage mock ────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
