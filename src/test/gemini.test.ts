import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askPulsarAI } from '../lib/gemini';

describe('askPulsarAI', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── API key yok ───────────────────────────────────────────────
  it('API key yoksa fallback mesaj döner', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    const result = await askPulsarAI('test');
    expect(result).toContain('VITE_GEMINI_API_KEY');
  });

  // ── Google API (AIza key) ─────────────────────────────────────
  it('AIza key → Google Generative API çağrısı yapar', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaTestKey123');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Test yanıt' }] } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await askPulsarAI('merhaba');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.any(Object)
    );
    expect(result).toBe('Test yanıt');
  });

  it('Google API başarılı → candidates[0] metnini döner', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaTestKey123');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Efendim, sisteminiz güvende.' }] } }],
      }),
    }));

    const result = await askPulsarAI('sistem durumu');
    expect(result).toBe('Efendim, sisteminiz güvende.');
  });

  it('Google API response.ok=false → hata mesajı döner', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaTestKey123');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }));

    const result = await askPulsarAI('test');
    expect(result).toContain('hata');
  });

  it('fetch throw (network hatası) → hata mesajı döner', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaTestKey123');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await askPulsarAI('test');
    expect(result).toContain('hata');
  });

  it('Boş candidates dizisi → "Sorgunuzu işleyemedim" döner', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaTestKey123');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    }));

    const result = await askPulsarAI('test');
    expect(result).toContain('işleyemedim');
  });

  // ── OpenRouter (sk- key) ──────────────────────────────────────
  it('sk- key → OpenRouter API çağrısı yapar', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'sk-or-v1-testkey');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OpenRouter yanıtı' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await askPulsarAI('test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('openrouter.ai'),
      expect.any(Object)
    );
    expect(result).toBe('OpenRouter yanıtı');
  });

  it('OpenRouter başarılı → choices[0].message.content döner', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'sk-or-v1-testkey');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Efendim, merhaba!' } }],
      }),
    }));

    const result = await askPulsarAI('merhaba');
    expect(result).toBe('Efendim, merhaba!');
  });

  it('context parametresi system prompt içinde geçer', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaTestKey123');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'yanıt' }] } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await askPulsarAI('test', 'Güven Skoru: 95');
    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(JSON.stringify(callBody)).toContain('Güven Skoru: 95');
  });
});
