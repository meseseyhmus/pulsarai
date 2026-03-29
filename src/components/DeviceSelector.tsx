import { useEffect } from 'react';
import { Mic, Volume2, Radio, Zap, Settings } from 'lucide-react';
import type { AudioDevice } from '../hooks/useMediaDevices';

interface DeviceSelectorProps {
  open: boolean;
  audioInputs: AudioDevice[];
  audioOutputs: AudioDevice[];
  selectedMicId: string;
  selectedSpeakerId: string;
  micLevel: number;
  onSelectMic: (id: string) => void;
  onSelectSpeaker: (id: string) => void;
  startMicPreview: (id: string) => Promise<void>;
  stopMicPreview: () => void;
  testSpeaker: (id: string) => void;
  onConfirm: (micId: string, speakerId: string) => void;
  onClose: () => void;
}

export default function DeviceSelector({
  open,
  audioInputs,
  audioOutputs,
  selectedMicId,
  selectedSpeakerId,
  micLevel,
  onSelectMic,
  onSelectSpeaker,
  startMicPreview,
  stopMicPreview,
  testSpeaker,
  onConfirm,
  onClose,
}: DeviceSelectorProps) {

  // Mic önizlemesini seçim değişince yeniden başlat
  useEffect(() => {
    if (!open) {
      stopMicPreview();
      return;
    }
    startMicPreview(selectedMicId);
    return () => stopMicPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedMicId]);

  if (!open) return null;

  const vuBars = Array.from({ length: 20 }, (_, i) => {
    const threshold = (i / 20) * 100;
    const active = micLevel > threshold;
    const color = i < 12
      ? 'var(--pulsar-cyan)'
      : i < 16
        ? 'var(--pulsar-amber)'
        : 'var(--pulsar-red)';
    return { active, color };
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Modal Panel */}
      <div
        className="hud-panel"
        style={{
          width: 480,
          maxWidth: '95vw',
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          border: '1px solid rgba(0,212,255,0.4)',
          boxShadow: '0 0 60px rgba(0,212,255,0.12), 0 0 120px rgba(0,212,255,0.05)',
          position: 'relative',
        }}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(0,212,255,0.15)', paddingBottom: 16 }}>
          <Settings className="w-5 h-5" style={{ color: 'var(--pulsar-cyan)' }} />
          <div>
            <h2 className="font-heading" style={{ color: 'var(--pulsar-cyan)', letterSpacing: 4, fontSize: 14, fontWeight: 700, margin: 0 }}>
              AUDIO CONFIGURATION
            </h2>
            <p className="font-mono-data" style={{ color: 'var(--pulsar-text-dim)', fontSize: 9, letterSpacing: 2, margin: 0 }}>
              SYS-INIT // SESSİZ BAŞLATMA ÖNCESİ CİHAZ SEÇİMİ
            </p>
          </div>
        </div>

        {/* Mikrofon Bölümü */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mic className="w-4 h-4" style={{ color: 'var(--pulsar-cyan)' }} />
            <span className="font-heading" style={{ color: 'var(--pulsar-cyan)', fontSize: 10, letterSpacing: 3 }}>
              MİKROFON GİRİŞİ
            </span>
          </div>

          <select
            value={selectedMicId}
            onChange={e => onSelectMic(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: 'var(--pulsar-text)',
              padding: '8px 12px',
              fontSize: 11,
              fontFamily: 'Courier Prime, monospace',
              letterSpacing: 1,
              outline: 'none',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            {audioInputs.length === 0 && (
              <option value="default">Varsayılan Mikrofon</option>
            )}
            {audioInputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>

          {/* VU Meter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="font-mono-data" style={{ color: 'var(--pulsar-text-dim)', fontSize: 9, letterSpacing: 2 }}>
              SES SEVİYESİ — {micLevel}%
            </span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, background: 'rgba(0,0,0,0.4)', padding: '4px 8px', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 2 }}>
              {vuBars.map((bar, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: bar.active ? `${Math.max(20, micLevel)}%` : '15%',
                    background: bar.active ? bar.color : 'rgba(255,255,255,0.06)',
                    boxShadow: bar.active ? `0 0 6px ${bar.color}` : 'none',
                    borderRadius: 1,
                    transition: 'height 0.06s ease, background 0.1s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mikrofon izni durumu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio className="w-3 h-3" style={{ color: micLevel > 0 ? 'var(--pulsar-green)' : 'var(--pulsar-text-dim)' }} />
            <span className="font-mono-data" style={{ color: micLevel > 0 ? 'var(--pulsar-green)' : 'var(--pulsar-text-dim)', fontSize: 9, letterSpacing: 2 }}>
              {micLevel > 0 ? 'MİKROFON AKTİF — SES ALINIYOR' : 'MİKROFON İZİN BEKLENİYOR...'}
            </span>
          </div>
        </div>

        {/* Hoparlör Bölümü */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 className="w-4 h-4" style={{ color: 'var(--pulsar-cyan)' }} />
            <span className="font-heading" style={{ color: 'var(--pulsar-cyan)', fontSize: 10, letterSpacing: 3 }}>
              HOPARLÖR ÇIKIŞI
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={selectedSpeakerId}
              onChange={e => onSelectSpeaker(e.target.value)}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: 'var(--pulsar-text)',
                padding: '8px 12px',
                fontSize: 11,
                fontFamily: 'Courier Prime, monospace',
                letterSpacing: 1,
                outline: 'none',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            >
              {audioOutputs.length === 0 && (
                <option value="default">Varsayılan Hoparlör</option>
              )}
              {audioOutputs.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>

            <button
              onClick={() => testSpeaker(selectedSpeakerId)}
              className="hud-btn"
              style={{
                padding: '8px 14px',
                fontSize: 10,
                fontFamily: 'Courier Prime, monospace',
                letterSpacing: 2,
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: 'var(--pulsar-cyan)',
                cursor: 'pointer',
                borderRadius: 2,
                whiteSpace: 'nowrap',
              }}
            >
              TEST SES
            </button>
          </div>
        </div>

        {/* Alt Butonlar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: 16 }}>
          <button
            onClick={onClose}
            className="hud-btn"
            style={{
              padding: '10px 20px',
              fontSize: 11,
              fontFamily: 'Courier Prime, monospace',
              letterSpacing: 2,
              color: 'var(--pulsar-text-dim)',
              border: '1px solid rgba(0,212,255,0.15)',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 2,
            }}
          >
            İPTAL
          </button>

          <button
            onClick={() => onConfirm(selectedMicId, selectedSpeakerId)}
            style={{
              padding: '10px 24px',
              fontSize: 11,
              fontFamily: 'Courier Prime, monospace',
              letterSpacing: 2,
              fontWeight: 700,
              background: 'var(--pulsar-cyan)',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 2,
              boxShadow: '0 0 16px rgba(0,212,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Zap className="w-4 h-4" />
            ONAYLA VE BAŞLAT
          </button>
        </div>
      </div>
    </div>
  );
}
