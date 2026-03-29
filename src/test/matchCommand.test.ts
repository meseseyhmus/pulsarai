import { describe, it, expect } from 'vitest';
import { matchCommand } from '../hooks/useVoiceCommands';

describe('matchCommand', () => {
  // ── greeting ─────────────────────────────────────────────────
  it('merhaba → greeting', () => {
    expect(matchCommand('merhaba')).toBe('greeting');
  });
  it('selam → greeting', () => {
    expect(matchCommand('selam')).toBe('greeting');
  });
  it('hoş geldin → greeting', () => {
    expect(matchCommand('hoş geldin')).toBe('greeting');
  });

  // ── status ───────────────────────────────────────────────────
  it('sistem durumu → status', () => {
    expect(matchCommand('sistem durumu nedir')).toBe('status');
  });
  it('durum nedir → status', () => {
    expect(matchCommand('durum nedir')).toBe('status');
  });
  it('durum raporu → status', () => {
    expect(matchCommand('durum raporu ver')).toBe('status');
  });

  // ── jamming ──────────────────────────────────────────────────
  it('jamming → jamming', () => {
    expect(matchCommand('jamming testi başlat')).toBe('jamming');
  });
  it('red team → jamming', () => {
    expect(matchCommand('red team simülasyonu')).toBe('jamming');
  });
  it('saldırı testi → jamming', () => {
    expect(matchCommand('saldırı testi başlat')).toBe('jamming');
  });

  // ── last_alarm ───────────────────────────────────────────────
  it('son alarm → last_alarm', () => {
    expect(matchCommand('son alarm neydi')).toBe('last_alarm');
  });
  it('alarm detay → last_alarm', () => {
    expect(matchCommand('alarm detayını göster')).toBe('last_alarm');
  });

  // ── download ─────────────────────────────────────────────────
  it('delil → download', () => {
    expect(matchCommand('delil paketini indir')).toBe('download');
  });
  it('indir → download', () => {
    expect(matchCommand('indir')).toBe('download');
  });
  it('export → download', () => {
    expect(matchCommand('export et')).toBe('download');
  });

  // ── silent ───────────────────────────────────────────────────
  it('sessiz → silent', () => {
    expect(matchCommand('sessiz mod')).toBe('silent');
  });
  it('mute → silent', () => {
    expect(matchCommand('mute')).toBe('silent');
  });

  // ── shutdown ─────────────────────────────────────────────────
  it('kapat → shutdown', () => {
    expect(matchCommand('sistemi kapat')).toBe('shutdown');
  });
  it('bekleme → shutdown', () => {
    expect(matchCommand('bekleme moduna al')).toBe('shutdown');
  });

  // ── help ─────────────────────────────────────────────────────
  it('komut → help', () => {
    expect(matchCommand('komutlar neler')).toBe('help');
  });
  it('yardım → help', () => {
    expect(matchCommand('yardım et')).toBe('help');
  });

  // ── bilinmeyen ───────────────────────────────────────────────
  it('rastgele metin → null', () => {
    expect(matchCommand('hava bugün nasıl')).toBeNull();
  });
  it('boş string → null', () => {
    expect(matchCommand('')).toBeNull();
  });

  // ── büyük/küçük harf bağımsız ────────────────────────────────
  it('büyük harf MERHABA → greeting', () => {
    expect(matchCommand('MERHABA')).toBe('greeting');
  });
  it('karışık harf SiStEm DuRuMu → status', () => {
    expect(matchCommand('SiStEm DuRuMu')).toBe('status');
  });

  // ── başında/sonunda boşluk ────────────────────────────────────
  it('boşluklu girdi → doğru komut', () => {
    expect(matchCommand('  merhaba  ')).toBe('greeting');
  });
});
