import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, ShieldAlert, Cpu, Activity, Database,
  Crosshair, Radio, Zap, Globe,
  X, Download, AlertTriangle, Shield,
  Eye, Layers, BarChart3, Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import VoiceCommandHUD from './components/VoiceCommandHUD';
import PulsarCore from './components/PulsarCore';
import './App.css';

// ── Types ────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'jarvis';
  timestamp: Date;
}

interface AlarmRecord {
  id: string;
  type: 'spoofing' | 'jamming' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  details: string;
  xaiExplanation: string;
}

// ── Simulated AI responses ──────────────────────────────────────
const jarvisResponses: Record<string, string> = {
  default: "Sistem devrede. Yeni komutlarınızı bekliyorum efendim.",
  merhaba: "Merhaba efendim. Sistemler tamamen çalışır durumda. Güven skoru stabil.",
  durum: "Tüm çekirdek sistemleri optimal seviyede, efendim. Enerji protokolleri stabil.",
  gnss: "GNSS sensörleri aktif. Sinyal anomalileri anlık analiz ediliyor.",
  saldırı: "Güvenlik protokolü Delta devrede. Yetkisiz giriş girişimi engellenecektir.",
  rapor: "Son 24 saatte 3 hafif ağ dalgalanması dışında sistemler kusursuz çalıştı.",
  teşekkür: "Görevim, efendim.",
  sistem: "Ana iletişim ve savunma sistemleri %100 kapasitede çalışıyor.",
};

// ── Component ───────────────────────────────────────────────────
export default function App() {
  // ── State ──────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "P.U.L.S.A.R sistem başlatıldı. Tüm modüller çevrimiçi. Size nasıl yardımcı olabilirim efendim?",
      sender: 'jarvis',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // System metrics
  const [cpuUsage, setCpuUsage] = useState(12);
  const [memUsage, setMemUsage] = useState(34);
  const [networkLatency, setNetworkLatency] = useState(14);
  const [trustScore, setTrustScore] = useState(96);

  // GNSS states
  const [gnssStatus, setGnssStatus] = useState<'SECURE' | 'WARNING' | 'ATTACK'>('SECURE');
  const [gnssLog, setGnssLog] = useState<string[]>(['[SYS] GNSS başlatıldı.', '[SYS] Uydu kilidi: AKTİF']);
  const [isAlarmShake, setIsAlarmShake] = useState(false);

  // XAI panel
  const [xaiOpen, setXaiOpen] = useState(false);
  const [xaiAlarm, setXaiAlarm] = useState<AlarmRecord | null>(null);

  // Alarm log
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);

  // Comm log (decoration)
  const [commLog] = useState([
    '> Encrypted channel established',
    '> AES-256 handshake verified',
    '> Routing through proxy 7...',
    '> GNSS fusion lock: NOMINAL',
    '> Listening for signals...'
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Voice command system ───────────────────────────────────────
  const getSystemStatus = useCallback(() => {
    const layerTexts = gnssStatus === 'ATTACK'
      ? 'GNSS katmanı saldırı altında.'
      : gnssStatus === 'WARNING'
        ? 'GNSS katmanında anomali var.'
        : 'Tüm katmanlar aktif ve stabil.';
    const lastAlarmText = alarms.length > 0
      ? `Son alarm: ${alarms[0].message}`
      : 'Son alarm kaydı yok.';
    return `Sistem durumu: ${layerTexts} Güven skoru ${trustScore}. CPU ${cpuUsage.toFixed(0)}%. Bellek ${memUsage.toFixed(0)}%. ${lastAlarmText}`;
  }, [gnssStatus, trustScore, cpuUsage, memUsage, alarms]);

  const getLastAlarm = useCallback(() => {
    if (alarms.length === 0) return 'Kayıtlı alarm bulunamadı.';
    return alarms[0].message;
  }, [alarms]);

  const getTrustScore = useCallback(() => trustScore, [trustScore]);

  const triggerJammingTest = useCallback(() => {
    setGnssStatus('WARNING');
    setTrustScore(prev => Math.max(40, prev - 30));
    setGnssLog(l => ['[RED-TEAM] Jamming simülasyonu başlatıldı...', ...l].slice(0, 6));

    const alarm: AlarmRecord = {
      id: Date.now().toString(),
      type: 'jamming',
      severity: 'high',
      message: 'Red Team Jamming Simülasyonu aktif',
      timestamp: new Date(),
      details: 'Manuel tetikleme ile jamming testi. L1/L5 bantlarında karıştırma sinyali enjekte edildi.',
      xaiExplanation: 'RF analiz katmanı, L1 bandında +15dB güç artışı, L5 bandında +12dB güç artışı tespit etti. Sinyal karışım oranı (SIR) -8dB seviyesine düştü. Karar motoru: %94 olasılıkla jamming saldırısı.',
    };
    setAlarms(prev => [alarm, ...prev].slice(0, 10));

    setTimeout(() => {
      setGnssStatus('ATTACK');
      setGnssLog(l => ['[ALERT] JAMMING TESPİT EDİLDİ!', ...l].slice(0, 6));
      setIsAlarmShake(true);
      setTimeout(() => setIsAlarmShake(false), 600);
    }, 2000);

    setTimeout(() => {
      setGnssStatus('SECURE');
      setTrustScore(prev => Math.min(98, prev + 25));
      setGnssLog(l => ['[SYS] Simülasyon tamamlandı. Sistem stabil.', ...l].slice(0, 6));
    }, 8000);
  }, []);

  const openXAIPanel = useCallback(() => {
    if (alarms.length > 0) {
      setXaiAlarm(alarms[0]);
      setXaiOpen(true);
    }
  }, [alarms]);

  const downloadEvidence = useCallback(() => {
    const evidence = {
      timestamp: new Date().toISOString(),
      systemStatus: gnssStatus,
      trustScore,
      alarms: alarms.slice(0, 5),
      gnssLog,
      metrics: { cpu: cpuUsage, memory: memUsage, latency: networkLatency },
    };
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsar-evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [gnssStatus, trustScore, alarms, gnssLog, cpuUsage, memUsage, networkLatency]);

  const voice = useVoiceCommands({
    onTriggerJammingTest: triggerJammingTest,
    onOpenXAIPanel: openXAIPanel,
    onDownloadEvidence: downloadEvidence,
    getSystemStatus,
    getLastAlarm,
    getTrustScore,
  });

  // ── System stats simulation ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(p => Math.min(100, Math.max(5, p + (Math.random() * 8 - 4))));
      setMemUsage(p => Math.min(100, Math.max(20, p + (Math.random() * 4 - 2))));
      setNetworkLatency(p => Math.min(200, Math.max(8, p + (Math.random() * 6 - 3))));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // ── GNSS attack simulation ────────────────────────────────────
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const triggerAnomaly = () => {
      if (Math.random() > 0.82) {
        setGnssStatus('WARNING');
        setTrustScore(p => Math.max(50, p - 15));
        setGnssLog(l => ['[WARN] Sinyal frekansı anomalisi', ...l].slice(0, 6));

        setTimeout(() => {
          if (Math.random() > 0.5) {
            setGnssStatus('ATTACK');
            setTrustScore(p => Math.max(20, p - 25));
            setIsAlarmShake(true);
            setTimeout(() => setIsAlarmShake(false), 600);

            const alarm: AlarmRecord = {
              id: Date.now().toString(),
              type: 'spoofing',
              severity: 'critical',
              message: 'GNSS Spoofing saldırısı doğrulandı',
              timestamp: new Date(),
              details: 'Birden fazla uydudan anormal pozisyon verisi alınıyor. Konum sapması >100m.',
              xaiExplanation: 'Pozisyon çözümü L1/L5 karşılaştırmasında tutarsızlık tespit edildi. Signal-of-Opportunity referanslarıyla doğrulandı. Saldırgan profili: Tekil kaynaklı spoofing. Tahmini güç: +5dBW.',
            };
            setAlarms(prev => [alarm, ...prev].slice(0, 10));

            setGnssLog(l => ['[ALERT] SPOOFING TESPİT EDİLDİ!', ...l].slice(0, 6));
            voice.speak("Uyarı efendim. GNSS Spoofing saldırısı tespit edildi. Savunma protokolleri aktif.");

            setTimeout(() => {
              setGnssStatus('SECURE');
              setTrustScore(p => Math.min(98, p + 30));
              setGnssLog(l => ['[SYS] Tehdit bertaraf edildi.', ...l].slice(0, 6));
            }, 8000);
          } else {
            setGnssStatus('SECURE');
            setTrustScore(p => Math.min(98, p + 10));
            setGnssLog(l => ['[SYS] Anomali geçiciydi. Normal.', ...l].slice(0, 6));
          }
        }, 3000);
      }
      timeout = setTimeout(triggerAnomaly, Math.random() * 20000 + 12000);
    };
    triggerAnomaly();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Chat logic ────────────────────────────────────────────────
  const getJarvisResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    for (const [key, response] of Object.entries(jarvisResponses)) {
      if (lower.includes(key)) return response;
    }
    return jarvisResponses.default;
  };

  const sendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    setTimeout(() => {
      const responseText = getJarvisResponse(userMessage.text);
      const jarvisMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'jarvis',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, jarvisMessage]);
      setIsThinking(false);
      voice.speak(responseText);
    }, 1200);
  }, [inputValue, voice]);

  // ── Derived ───────────────────────────────────────────────────
  const scoreColor = useMemo(() => {
    if (trustScore >= 80) return 'var(--pulsar-green)';
    if (trustScore >= 50) return 'var(--pulsar-amber)';
    return 'var(--pulsar-red)';
  }, [trustScore]);

  const scoreLabel = useMemo(() => {
    if (trustScore >= 80) return 'STABIL';
    if (trustScore >= 50) return 'DİKKAT';
    return 'KRİTİK';
  }, [trustScore]);

  // ── Speaking state from voice hook ─────────────────────────────
  const isSpeaking = voice.status === 'speaking';

  return (
    <div
      className={`h-screen w-full flex flex-col overflow-hidden scanlines relative ${isAlarmShake ? 'screen-shake' : ''}`}
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #0a1628 0%, #020817 50%, #000 100%)' }}
      role="application"
      aria-label="PULSAR GNSS Güvenlik HUD Arayüzü"
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scan-beam" />

      {/* ════ HEADER ════ */}
      <header
        className="w-full px-6 py-3 flex justify-between items-center z-10 border-b"
        style={{ borderColor: 'var(--pulsar-border)', background: 'rgba(6,14,30,0.6)', backdropFilter: 'blur(12px)' }}
        role="banner"
      >
        <div className="flex flex-col gap-0.5">
          <h1
            className="font-heading text-xl font-bold glow-cyan flex items-center gap-3"
            style={{ color: 'var(--pulsar-cyan)', letterSpacing: '4px' }}
          >
            <Zap className="w-5 h-5" aria-hidden="true" />
            P.U.L.S.A.R
          </h1>
          <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)' }}>
            PROTECTIVE UNIFIED LAYER FOR SIGNAL ASSURANCE & RESILIENCE // V.4.2.0
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Trust Score Badge */}
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)' }}>GÜVEN SKORU</span>
            <motion.div
              className="font-hud text-lg font-bold"
              style={{ color: scoreColor }}
              key={trustScore}
              initial={{ scale: 1.3, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              aria-label={`Güven skoru ${trustScore}`}
            >
              {trustScore}
            </motion.div>
          </div>

          {/* Score bar */}
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono-data text-[9px]" style={{ color: scoreColor }}>{scoreLabel}</span>
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full score-bar-fill"
                style={{ width: `${trustScore}%`, background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }}
              />
            </div>
          </div>

          {/* Sys status */}
          <div className="flex flex-col items-end">
            <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)' }}>SYS</span>
            <span
              className="font-hud text-xs font-bold glow-cyan"
              style={{ color: 'var(--pulsar-cyan)', animation: 'pulse-opacity 2s infinite' }}
            >
              ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* ════ MAIN HUD ════ */}
      <main className="flex-1 flex p-4 gap-4 relative z-10 overflow-hidden" role="main">

        {/* ── LEFT PANEL ── */}
        <div className="w-[280px] flex flex-col gap-3 flex-shrink-0">

          {/* Core Diagnostics */}
          <div className="hud-panel p-4 flex-1 flex flex-col" role="region" aria-label="Sistem Diagnostik Paneli">
            <h2 className="font-heading text-xs pb-2 mb-3 flex items-center gap-2 border-b" style={{ color: 'var(--pulsar-cyan)', borderColor: 'var(--pulsar-border)' }}>
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" /> CORE DIAGNOSTICS
            </h2>

            <div className="flex flex-col gap-5">
              {/* CPU */}
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono-data" style={{ color: 'var(--pulsar-text-dim)' }}>
                  <span>CPU LOAD</span>
                  <span>{cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full progress-fill rounded-full"
                    style={{ width: `${cpuUsage}%`, background: cpuUsage > 80 ? 'var(--pulsar-red)' : 'var(--pulsar-cyan)', boxShadow: `0 0 8px ${cpuUsage > 80 ? 'var(--pulsar-red)' : 'var(--pulsar-cyan)'}` }}
                    role="progressbar" aria-valuenow={cpuUsage} aria-valuemin={0} aria-valuemax={100} aria-label="CPU kullanımı"
                  />
                </div>
              </div>

              {/* Memory */}
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono-data" style={{ color: 'var(--pulsar-text-dim)' }}>
                  <span>MEMORY</span>
                  <span>{memUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full progress-fill rounded-full"
                    style={{ width: `${memUsage}%`, background: memUsage > 85 ? 'var(--pulsar-red)' : 'var(--pulsar-cyan)', boxShadow: `0 0 8px ${memUsage > 85 ? 'var(--pulsar-red)' : 'var(--pulsar-cyan)'}` }}
                    role="progressbar" aria-valuenow={memUsage} aria-valuemin={0} aria-valuemax={100} aria-label="Bellek kullanımı"
                  />
                </div>
              </div>

              {/* Network Latency */}
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono-data" style={{ color: 'var(--pulsar-text-dim)' }}>
                  <span>NETWORK</span>
                  <span>{networkLatency.toFixed(0)}ms</span>
                </div>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full progress-fill rounded-full"
                    style={{ width: `${Math.min(100, (networkLatency / 200) * 100)}%`, background: networkLatency > 100 ? 'var(--pulsar-amber)' : 'var(--pulsar-green)', boxShadow: `0 0 8px ${networkLatency > 100 ? 'var(--pulsar-amber)' : 'var(--pulsar-green)'}` }}
                    role="progressbar" aria-label="Ağ gecikmesi"
                  />
                </div>
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="p-2 text-center rounded" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid var(--pulsar-border)' }}>
                  <Database className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--pulsar-text-dim)' }} aria-hidden="true" />
                  <span className="text-[9px] block font-mono-data" style={{ color: 'var(--pulsar-text-dim)' }}>DATABANK</span>
                  <span className="text-xs font-hud glow-green" style={{ color: 'var(--pulsar-green)' }}>SECURE</span>
                </div>
                <div className="p-2 text-center rounded" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid var(--pulsar-border)' }}>
                  <Wifi className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--pulsar-text-dim)' }} aria-hidden="true" />
                  <span className="text-[9px] block font-mono-data" style={{ color: 'var(--pulsar-text-dim)' }}>UPLINK</span>
                  <span className="text-xs font-hud glow-cyan" style={{ color: 'var(--pulsar-cyan)' }}>844 Tb</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comm Log */}
          <div className="hud-panel p-3" role="log" aria-label="İletişim Günlüğü">
            <h2 className="font-heading text-[10px] pb-1.5 mb-2 flex items-center gap-2 border-b" style={{ color: 'var(--pulsar-cyan)', borderColor: 'var(--pulsar-border)' }}>
              <Radio className="w-3 h-3" aria-hidden="true" /> COMM LOG
            </h2>
            <div className="font-mono-data text-[9px] flex flex-col gap-1" style={{ color: 'rgba(0,212,255,0.3)' }}>
              {commLog.map((line, i) => (
                <p key={i} className={i === commLog.length - 1 ? 'animate-pulse' : ''} style={i === commLog.length - 1 ? { color: 'var(--pulsar-text-dim)' } : {}}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* Voice Command Panel */}
          <VoiceCommandHUD
            status={voice.status}
            transcript={voice.transcript}
            lastEvent={voice.lastEvent}
            isSilentMode={voice.isSilentMode}
            wakeWordDetected={voice.wakeWordDetected}
            permissionDenied={voice.permissionDenied}
            micAvailable={voice.micAvailable}
            onToggle={voice.toggleListening}
            onSilentToggle={() => voice.setIsSilentMode(p => !p)}
          />
        </div>

        {/* ── CENTER: PULSAR CORE ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative">

          {/* PULSAR Core - Canvas-powered holographic reactor */}
          <PulsarCore
            status={gnssStatus}
            isSpeaking={isSpeaking}
            size={380}
          />

          {/* ── Voice Terminal ── */}
          <div className="mt-auto w-full max-w-2xl" style={{ background: 'var(--pulsar-bg-panel)', backdropFilter: 'blur(12px)', border: '1px solid var(--pulsar-border)', borderRadius: 4, padding: '14px 18px' }}>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 mb-3 h-5">
              {isSpeaking ? (
                <motion.div className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="font-mono-data text-[10px] mr-3" style={{ color: 'var(--pulsar-cyan)', letterSpacing: 3 }}>YANIT VERİYOR</span>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="audio-bar"
                      animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                      transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </motion.div>
              ) : isThinking ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)', letterSpacing: 2 }}>DÜŞÜNÜYORUM</span>
                  <div className="flex gap-1.5">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                  </div>
                </div>
              ) : (
                <span className="font-mono-data text-[10px]" style={{ color: 'rgba(0,212,255,0.2)', letterSpacing: 3 }}>
                  KOMUT BEKLENİYOR
                </span>
              )}
            </div>

            {/* Input row */}
            <div className="flex gap-3">
              <button
                onClick={voice.toggleListening}
                className={`voice-mic-btn ${voice.status !== 'idle' && voice.status !== 'standby' ? 'voice-mic-active' : 'voice-mic-idle'}`}
                aria-label={voice.status !== 'idle' ? 'Ses girişini durdur' : 'Ses girişini başlat'}
                tabIndex={0}
              >
                {/* Mic wave rings */}
                {voice.status === 'listening' && (
                  <>
                    <div className="mic-wave-ring mic-wave-ring-1" />
                    <div className="mic-wave-ring mic-wave-ring-2" />
                    <div className="mic-wave-ring mic-wave-ring-3" />
                  </>
                )}
                <Mic className="w-5 h-5 relative z-10" />
              </button>

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={voice.status === 'listening' ? 'Ses aktarımı bekleniyor...' : 'Komut girin...'}
                className="flex-1 h-10 text-sm font-mono-data"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--pulsar-border)',
                  color: 'var(--pulsar-text)',
                  letterSpacing: '0.5px',
                }}
                aria-label="Metin komutu girişi"
                tabIndex={0}
              />

              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim()}
                className="h-10 px-5 font-hud text-xs font-bold tracking-wider"
                style={{
                  background: 'var(--pulsar-cyan)',
                  color: '#000',
                  boxShadow: '0 0 12px rgba(0,212,255,0.25)',
                  opacity: !inputValue.trim() ? 0.4 : 1,
                }}
                tabIndex={0}
                aria-label="Komutu çalıştır"
              >
                EXECUTE
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-[280px] flex flex-col gap-3 flex-shrink-0">

          {/* GNSS Monitor */}
          <div
            className={`hud-panel p-4 flex-1 flex flex-col transition-all duration-500 ${gnssStatus === 'ATTACK' ? 'warning-pulse status-pattern-attack' : gnssStatus === 'WARNING' ? 'status-pattern-warning' : 'status-pattern-secure'}`}
            style={gnssStatus === 'ATTACK' ? { borderColor: 'var(--pulsar-red)' } : gnssStatus === 'WARNING' ? { borderColor: 'var(--pulsar-amber)' } : {}}
            role="region"
            aria-label="GNSS İzleme Paneli"
            aria-live="polite"
          >
            <h2 className="font-heading text-xs pb-2 mb-3 flex items-center justify-between border-b" style={{ color: gnssStatus === 'ATTACK' ? 'var(--pulsar-red)' : 'var(--pulsar-cyan)', borderColor: 'var(--pulsar-border)' }}>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" aria-hidden="true" /> GNSS MONITOR
              </div>
              {gnssStatus !== 'SECURE' && (
                <ShieldAlert className="w-4 h-4" style={{ color: gnssStatus === 'ATTACK' ? 'var(--pulsar-red)' : 'var(--pulsar-amber)', animation: gnssStatus === 'ATTACK' ? 'pulse-opacity 1s infinite' : undefined }} aria-label={gnssStatus === 'ATTACK' ? 'Saldırı tespit edildi' : 'Uyarı'} />
              )}
            </h2>

            {/* Satellite visualization */}
            <div className="relative w-full aspect-square max-h-36 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--pulsar-border)' }}>
              <Crosshair className="w-24 h-24" style={{ color: gnssStatus === 'ATTACK' ? 'rgba(255,51,51,0.15)' : 'rgba(0,212,255,0.1)' }} aria-hidden="true" />

              {/* Orbiting satellites */}
              {[
                { radius: 50, duration: 6, color: gnssStatus === 'ATTACK' ? 'var(--pulsar-red)' : 'var(--pulsar-green)' },
                { radius: 40, duration: 8, color: 'var(--pulsar-green)' },
                { radius: 55, duration: 10, color: 'var(--pulsar-green)' },
                { radius: 35, duration: 12, color: gnssStatus === 'ATTACK' ? 'var(--pulsar-red)' : 'var(--pulsar-green)' },
              ].map((sat, i) => (
                <div
                  key={i}
                  className="absolute sat-orbit"
                  style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: sat.color,
                    boxShadow: `0 0 6px ${sat.color}`,
                    top: '50%', left: '50%',
                    marginTop: -3, marginLeft: -3,
                    ['--orbit-radius' as any]: `${sat.radius}px`,
                    ['--orbit-duration' as any]: `${sat.duration}s`,
                  }}
                />
              ))}

              {/* Attack overlay */}
              <AnimatePresence>
                {gnssStatus === 'ATTACK' && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ background: 'rgba(255,51,51,0.1)' }}
                  >
                    <span className="font-hud text-sm font-bold glow-red danger-text-glitch px-2 py-1" style={{ color: 'var(--pulsar-red)', background: 'rgba(0,0,0,0.7)' }}>
                      SPOOFING
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* GNSS Log */}
            <div className="font-mono-data text-[9px] flex flex-col gap-1 flex-1" role="log" aria-label="GNSS Olay Günlüğü">
              {gnssLog.map((log, i) => (
                <motion.div
                  key={`${i}-${log}`}
                  initial={i === 0 ? { opacity: 0, x: -10 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className={log.includes('ALERT') || log.includes('SPOOFING') || log.includes('JAMMING')
                    ? 'glow-red font-bold'
                    : log.includes('WARN') || log.includes('RED-TEAM')
                      ? ''
                      : ''}
                  style={{
                    color: log.includes('ALERT') || log.includes('SPOOFING') || log.includes('JAMMING')
                      ? 'var(--pulsar-red)' : log.includes('WARN') || log.includes('RED-TEAM')
                        ? 'var(--pulsar-amber)' : 'rgba(0,212,255,0.35)'
                  }}
                >
                  {log}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Dialogue Log */}
          <div className="hud-panel flex-1 p-4 flex flex-col" role="log" aria-label="PULSAR Diyalog Günlüğü">
            <h2 className="font-heading text-[10px] pb-2 mb-3 border-b flex items-center gap-2" style={{ color: 'var(--pulsar-cyan)', borderColor: 'var(--pulsar-border)', letterSpacing: 3 }}>
              <Activity className="w-3 h-3" aria-hidden="true" /> DIALOGUE LOG
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.slice(-6).map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-mono-data text-[8px] mb-0.5" style={{ color: message.sender === 'user' ? 'var(--pulsar-text-dim)' : 'rgba(0,212,255,0.5)' }}>
                    {message.sender === 'user' ? 'USER' : 'PULSAR'} // {message.timestamp.toLocaleTimeString()}
                  </span>
                  <div
                    className="text-[10px] p-2 max-w-[95%] font-body"
                    style={{
                      background: message.sender === 'user' ? 'rgba(0,212,255,0.06)' : 'rgba(6,14,30,0.8)',
                      border: `1px solid ${message.sender === 'user' ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.08)'}`,
                      color: message.sender === 'user' ? 'var(--pulsar-text)' : 'rgba(0,212,255,0.7)',
                      borderRadius: 2,
                      textAlign: message.sender === 'user' ? 'right' : 'left',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {message.text}
                  </div>
                </motion.div>
              ))}

              {/* Thinking indicator */}
              <AnimatePresence>
                {isThinking && (
                  <motion.div
                    className="flex items-start"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="p-2 flex items-center gap-2" style={{ background: 'rgba(6,14,30,0.8)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 2 }}>
                      <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)' }}>Düşünüyorum</span>
                      <div className="flex gap-1">
                        <span className="thinking-dot" />
                        <span className="thinking-dot" />
                        <span className="thinking-dot" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hud-panel p-3 flex flex-col gap-2" role="toolbar" aria-label="Hızlı Eylemler">
            <h2 className="font-heading text-[10px] pb-1.5 mb-1 border-b flex items-center gap-2" style={{ color: 'var(--pulsar-cyan)', borderColor: 'var(--pulsar-border)' }}>
              <Layers className="w-3 h-3" aria-hidden="true" /> QUICK ACTIONS
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="hud-btn font-mono-data text-[9px] p-2 flex flex-col items-center gap-1 rounded"
                onClick={triggerJammingTest}
                tabIndex={0}
                aria-label="Jamming testi başlat"
              >
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--pulsar-amber)' }} />
                JAMMING TEST
              </button>
              <button
                className="hud-btn font-mono-data text-[9px] p-2 flex flex-col items-center gap-1 rounded"
                onClick={openXAIPanel}
                tabIndex={0}
                aria-label="Son alarmı incele"
              >
                <Eye className="w-3.5 h-3.5" style={{ color: 'var(--pulsar-cyan)' }} />
                XAI PANEL
              </button>
              <button
                className="hud-btn font-mono-data text-[9px] p-2 flex flex-col items-center gap-1 rounded"
                onClick={downloadEvidence}
                tabIndex={0}
                aria-label="Delil paketi indir"
              >
                <Download className="w-3.5 h-3.5" style={{ color: 'var(--pulsar-green)' }} />
                EVIDENCE
              </button>
              <button
                className="hud-btn font-mono-data text-[9px] p-2 flex flex-col items-center gap-1 rounded"
                onClick={() => { setXaiOpen(false); }}
                tabIndex={0}
                aria-label="Durum raporu"
              >
                <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--pulsar-cyan)' }} />
                REPORT
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ════ XAI PANEL (Slide-in) ════ */}
      <AnimatePresence>
        {xaiOpen && xaiAlarm && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[899]"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setXaiOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className="xai-panel"
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              role="dialog"
              aria-label="XAI Açıklama Paneli"
              aria-modal="true"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-sm glow-cyan" style={{ color: 'var(--pulsar-cyan)' }}>
                  <Shield className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  XAI EXPLANATION
                </h2>
                <button
                  onClick={() => setXaiOpen(false)}
                  className="hud-btn p-1.5 rounded"
                  tabIndex={0}
                  aria-label="Paneli kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Alarm details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-5"
              >
                {/* Severity badge */}
                <div className="flex items-center gap-3">
                  <div
                    className="font-hud text-[10px] px-3 py-1 rounded"
                    style={{
                      background: xaiAlarm.severity === 'critical' ? 'rgba(255,51,51,0.15)' : 'rgba(245,158,11,0.15)',
                      color: xaiAlarm.severity === 'critical' ? 'var(--pulsar-red)' : 'var(--pulsar-amber)',
                      border: `1px solid ${xaiAlarm.severity === 'critical' ? 'var(--pulsar-red-dim)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                  >
                    {xaiAlarm.severity.toUpperCase()}
                  </div>
                  <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)' }}>
                    {xaiAlarm.timestamp.toLocaleString('tr-TR')}
                  </span>
                </div>

                {/* Type */}
                <div>
                  <span className="font-heading text-[10px] block mb-1" style={{ color: 'var(--pulsar-text-dim)' }}>TİP</span>
                  <span className="font-body text-sm" style={{ color: 'var(--pulsar-text)' }}>{xaiAlarm.type.toUpperCase()}</span>
                </div>

                {/* Message */}
                <div>
                  <span className="font-heading text-[10px] block mb-1" style={{ color: 'var(--pulsar-text-dim)' }}>MESAJ</span>
                  <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--pulsar-text)' }}>{xaiAlarm.message}</p>
                </div>

                {/* Details */}
                <div>
                  <span className="font-heading text-[10px] block mb-1" style={{ color: 'var(--pulsar-text-dim)' }}>DETAYLAR</span>
                  <p className="font-body text-xs leading-relaxed" style={{ color: 'rgba(192,232,255,0.7)' }}>{xaiAlarm.details}</p>
                </div>

                {/* XAI Explanation */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-4 rounded"
                  style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid var(--pulsar-border)' }}
                >
                  <span className="font-heading text-[10px] block mb-2 glow-cyan" style={{ color: 'var(--pulsar-cyan)' }}>
                    🧠 AI AÇIKLAMASI (XAI)
                  </span>
                  <p className="font-body text-xs leading-relaxed" style={{ color: 'var(--pulsar-text)' }}>
                    {xaiAlarm.xaiExplanation}
                  </p>
                </motion.div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    className="hud-btn font-mono-data text-[10px] px-4 py-2 rounded flex items-center gap-2"
                    onClick={() => { downloadEvidence(); setXaiOpen(false); }}
                    tabIndex={0}
                  >
                    <Download className="w-3.5 h-3.5" style={{ color: 'var(--pulsar-green)' }} />
                    DELİL PAKETİ İNDİR
                  </button>
                  <button
                    className="hud-btn font-mono-data text-[10px] px-4 py-2 rounded"
                    onClick={() => setXaiOpen(false)}
                    tabIndex={0}
                  >
                    KAPAT
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
