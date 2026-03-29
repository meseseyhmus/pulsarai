import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, ShieldAlert, Cpu, Activity, Database,
  Crosshair, Radio, Zap, Globe,
  X, Download, AlertTriangle, Shield,
  Eye, Layers, BarChart3, Wifi, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { useMediaDevices } from './hooks/useMediaDevices';
import { usePulsarSync } from './hooks/usePulsarSync';
import VoiceCommandHUD from './components/VoiceCommandHUD';
import EvaViewer from './components/EvaViewer';
import DeviceSelector from './components/DeviceSelector';
import { askPulsarAI } from '@/lib/gemini';
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

  // System metrics - WebSocket'ten gelen gerçek veriler
  const { data: pulsarData, isConnected: isWsConnected } = usePulsarSync();
  const [cpuUsage, setCpuUsage] = useState(12);
  const [memUsage, setMemUsage] = useState(34);
  const [networkLatency, setNetworkLatency] = useState(14);
  const [trustScore, setTrustScore] = useState(96);
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
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(52);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setHeaderHeight(entries[0].contentRect.height);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleVoiceEvent = useCallback((event: any) => {
    if (event.type === 'no_speech' || !event.transcript) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: event.transcript,
      sender: 'user',
      timestamp: new Date(),
    };

    const jarvisMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: event.response,
      sender: 'jarvis',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, jarvisMessage]);
  }, []);

  // ── Audio device management ───────────────────────────────────
  const mediaDevices = useMediaDevices();
  const [showDeviceSelector, setShowDeviceSelector] = useState(
    () => !localStorage.getItem('pulsar_mic_id')
  );

  const voice = useVoiceCommands({
    onTriggerJammingTest: triggerJammingTest,
    onOpenXAIPanel: openXAIPanel,
    onDownloadEvidence: downloadEvidence,
    getSystemStatus,
    getLastAlarm,
    getTrustScore,
    onEventHandled: handleVoiceEvent,
    micDeviceId: mediaDevices.selectedMicId,
  });

  // ── WebSocket verilerini state'lere aktar ──────────────────────
  useEffect(() => {
    if (pulsarData) {
      if (pulsarData.cpu_usage !== undefined) setCpuUsage(pulsarData.cpu_usage);
      if (pulsarData.memory_usage !== undefined) setMemUsage(pulsarData.memory_usage);
      if (pulsarData.network_latency !== undefined) setNetworkLatency(pulsarData.network_latency);
      if (pulsarData.trust_score !== undefined) setTrustScore(pulsarData.trust_score);
      if (pulsarData.gnss_status !== undefined) {
        const prevStatus = gnssStatus;
        setGnssStatus(pulsarData.gnss_status);
        // Saldırı geçişlerinde sallantı efekti
        if (pulsarData.gnss_status === 'ATTACK' && prevStatus !== 'ATTACK') {
          setIsAlarmShake(true);
          setTimeout(() => setIsAlarmShake(false), 600);
        }
      }
    }
  }, [pulsarData, gnssStatus]);

  // ── Sistem açıldığında push-to-talk hazır ─────────────────────
  // (Stream yönetimi artık useVoiceCommands içinde)
  useEffect(() => {
    if (showDeviceSelector) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const API = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!API) {
      console.error('[PULSAR MIC] ❌ SpeechRecognition desteklenmiyor. Google Chrome kullanın.');
    } else {
      console.log('[PULSAR MIC] ✅ Sistem hazır. Push-to-talk aktif.');
    }
    return () => { voice.stopListening(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeviceSelector]);

  // ── System stats artık WebSocket'ten geliyor ───────────────────
  // Sahte simülasyon kaldırıldı - gerçek veriler kullanılıyor

  // ── GNSS attack simulation kaldırıldı ─────────────────────────
  // Gerçek saldırı verileri WebSocket'ten geliyor

  // ── Auto-scroll messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Chat logic ────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const currentInput = inputValue.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    const contextStr = `Sistem Durumu: Güven Skoru: ${trustScore}, GNSS Durumu: ${gnssStatus}, CPU: ${cpuUsage.toFixed(1)}%, Bellek: ${memUsage.toFixed(1)}%, Ağ Gecikmesi: ${networkLatency}ms, WebSocket Bağlantısı: ${isWsConnected ? 'AKTİF' : 'KAPALI'}${pulsarData?.active_attack ? `, Aktif Saldırı: ${pulsarData.active_attack}` : ''}${pulsarData?.threat_level && pulsarData.threat_level !== 'LOW' ? `, Tehdit Seviyesi: ${pulsarData.threat_level}` : ''}`;
    const responseText = await askPulsarAI(currentInput, contextStr);

    const jarvisMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: 'jarvis',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, jarvisMessage]);
    setIsThinking(false);
    voice.speak(responseText);
  }, [inputValue, voice, trustScore, gnssStatus, networkLatency]);

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

  const voiceState = useMemo(() => {
    if (voice.isRecording) return 'listening' as const;
    if (voice.status === 'processing') return 'processing' as const;
    if (voice.status === 'speaking') return 'speaking' as const;
    return 'idle' as const;
  }, [voice.isRecording, voice.status]);

  return (
    <div
      className={`flex flex-col scanlines ${isAlarmShake ? 'screen-shake' : ''}`}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 20%, #0a1628 0%, #020817 50%, #000 100%)' }}
      role="application"
      aria-label="PULSAR GNSS Güvenlik HUD Arayüzü"
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="scan-beam" />

      {/* ════ HEADER ════ */}
      <header
        ref={headerRef}
        className="w-full px-4 py-2 flex justify-between items-center border-b flex-shrink-0"
        style={{ borderColor: 'var(--pulsar-border)', background: 'rgba(6,14,30,0.95)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 200, minHeight: 48, overflow: 'hidden' }}
        role="banner"
      >
        <div className="flex flex-col gap-0 flex-shrink-0 min-w-0">
          <h1
            className="font-heading text-lg font-bold glow-cyan flex items-center gap-2"
            style={{ color: 'var(--pulsar-cyan)', letterSpacing: '4px', whiteSpace: 'nowrap' }}
          >
            <Zap className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            P.U.L.S.A.R
          </h1>
          <span className="font-mono-data text-[9px]" style={{ color: 'var(--pulsar-text-dim)', whiteSpace: 'nowrap' }}>
            GNSS SECURITY SYSTEM // V.4.2.0
          </span>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 flex-nowrap">
          {/* Trust Score Badge */}
          <div className="flex flex-col items-end gap-0 flex-shrink-0">
            <span className="font-mono-data text-[9px]" style={{ color: 'var(--pulsar-text-dim)', whiteSpace: 'nowrap' }}>GÜVEN SKORU</span>
            <motion.div
              className="font-hud text-base font-bold"
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
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="font-mono-data text-[9px]" style={{ color: scoreColor, whiteSpace: 'nowrap' }}>{scoreLabel}</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full score-bar-fill"
                style={{ width: `${trustScore}%`, background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }}
              />
            </div>
          </div>

          {/* Sys status */}
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="font-mono-data text-[9px]" style={{ color: 'var(--pulsar-text-dim)', whiteSpace: 'nowrap' }}>SYS</span>
            <span
              className="font-hud text-xs font-bold glow-cyan"
              style={{ color: 'var(--pulsar-cyan)', animation: 'pulse-opacity 2s infinite', whiteSpace: 'nowrap' }}
            >
              ONLINE
            </span>
          </div>

          {/* Cihaz ayarları butonu */}
          <button
            onClick={() => setShowDeviceSelector(true)}
            title="Ses Cihazı Ayarları"
            style={{ background: 'transparent', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 4, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'rgba(0,212,255,0.5)', flexShrink: 0 }}
            className="hud-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* FULLSCREEN EVA MODEL BACKGROUND */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          top: headerHeight,
          zIndex: 1,
          isolation: 'isolate',
          opacity: xaiOpen ? 0.4 : 0.85,
          transform: xaiOpen ? 'scale(0.55) translateY(-15%)' : 'scale(1) translateY(0)',
          filter: xaiOpen ? 'blur(8px)' : 'blur(0px)',
          transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'center center'
        }}
      >
        <EvaViewer
          status={gnssStatus}
          isSpeaking={isSpeaking}
          voiceState={voiceState}
          micLevel={voice.micLevel}
          size="100%"
        />
      </div>

      {/* ════ MAIN HUD ════ */}
      <main className="flex-1 flex p-4 gap-4 overflow-hidden pointer-events-none" style={{ position: 'relative', zIndex: 100, minHeight: 0 }} role="main">

        {/* ── LEFT PANEL ── */}
        <div className="w-[280px] flex flex-col gap-3 flex-shrink-0 pointer-events-auto" style={{ minHeight: 0, overflow: 'hidden' }}>

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
            onToggle={voice.toggleRecording}
            onSilentToggle={() => voice.setIsSilentMode(p => !p)}
          />
        </div>

        {/* ── CENTER: EVA 3D MODEL ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative pointer-events-none">

          {/* ── Voice Terminal ── */}
          <div className="mt-auto w-full max-w-2xl pointer-events-auto" style={{ background: 'var(--pulsar-bg-panel)', backdropFilter: 'blur(12px)', border: '1px solid var(--pulsar-border)', borderRadius: 4, padding: '16px 20px' }}>

            {/* Cihaz bilgisi + değiştir */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono-data text-[9px]" style={{ color: 'rgba(0,212,255,0.35)', letterSpacing: 2 }}>MİKROFON:</span>
                <span className="font-mono-data text-[9px]" style={{ color: 'rgba(0,212,255,0.6)' }}>
                  {mediaDevices.audioInputs.find(d => d.deviceId === mediaDevices.selectedMicId)?.label?.slice(0, 28) || 'Varsayılan'}
                </span>
              </div>
              <button
                onClick={() => setShowDeviceSelector(true)}
                className="font-mono-data text-[9px]"
                style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 3, padding: '2px 8px', color: 'rgba(0,212,255,0.5)', cursor: 'pointer', letterSpacing: 2 }}
              >
                DEĞİŞTİR
              </button>
            </div>

            {/* Durum göstergesi */}
            <div className="flex items-center justify-center gap-2 mb-3 h-6">
              {isSpeaking ? (
                <motion.div className="flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="font-mono-data text-[10px] mr-3" style={{ color: 'var(--pulsar-cyan)', letterSpacing: 3 }}>PULSAR KONUŞUYOR</span>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div key={i} className="audio-bar"
                      animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                      transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </motion.div>
              ) : voice.isRecording ? (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.div className="w-2 h-2 rounded-full" style={{ background: 'var(--pulsar-red)' }}
                    animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-red)', letterSpacing: 3 }}>KAYIT — KONUŞUN</span>
                  {voice.transcript && (
                    <span className="font-mono-data text-[10px] ml-2" style={{ color: 'rgba(0,212,255,0.6)' }}>
                      "{voice.transcript.slice(0, 40)}{voice.transcript.length > 40 ? '…' : ''}"
                    </span>
                  )}
                </motion.div>
              ) : isThinking ? (
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-[10px]" style={{ color: 'var(--pulsar-text-dim)', letterSpacing: 2 }}>PULSAR DÜŞÜNÜYOR</span>
                  <div className="flex gap-1.5">
                    <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
                  </div>
                </div>
              ) : (
                <span className="font-mono-data text-[10px]" style={{ color: 'rgba(0,212,255,0.2)', letterSpacing: 3 }}>
                  MİKROFONA BASIN, KONUŞUN, BIRAKIN
                </span>
              )}
            </div>

            {/* VU Meter — sadece kayıt sırasında göster */}
            <AnimatePresence>
              {voice.isRecording && (
                <motion.div
                  className="mb-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* VU Bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono-data text-[9px] flex-shrink-0" style={{ color: 'rgba(0,212,255,0.4)', letterSpacing: 1 }}>SES LVL</span>
                    <div className="flex-1 flex gap-[2px] items-end h-4">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const threshold = (i / 24) * 100;
                        const active = voice.micLevel > threshold;
                        const barColor = i < 16 ? 'var(--pulsar-green)' : i < 20 ? 'var(--pulsar-amber)' : 'var(--pulsar-red)';
                        return (
                          <div key={i} style={{ flex: 1, height: active ? '100%' : '20%', background: active ? barColor : 'rgba(255,255,255,0.06)', boxShadow: active ? `0 0 4px ${barColor}` : 'none', borderRadius: 1, transition: 'height 0.05s ease', minHeight: 2 }} />
                        );
                      })}
                    </div>
                    <span className="font-mono-data text-[9px] w-7 text-right flex-shrink-0" style={{ color: voice.micLevel > 10 ? 'var(--pulsar-green)' : 'rgba(255,255,255,0.2)' }}>
                      {voice.micLevel}
                    </span>
                  </div>

                  {/* Ses / Konuşma tespit durumu */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: voice.soundDetected ? 'var(--pulsar-green)' : 'rgba(255,255,255,0.1)', boxShadow: voice.soundDetected ? '0 0 6px var(--pulsar-green)' : 'none' }} />
                      <span className="font-mono-data text-[9px]" style={{ color: voice.soundDetected ? 'var(--pulsar-green)' : 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                        SES {voice.soundDetected ? '✓' : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: voice.speechDetected ? 'var(--pulsar-cyan)' : 'rgba(255,255,255,0.1)', boxShadow: voice.speechDetected ? '0 0 6px var(--pulsar-cyan)' : 'none' }} />
                      <span className="font-mono-data text-[9px]" style={{ color: voice.speechDetected ? 'var(--pulsar-cyan)' : 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                        KONUŞMA {voice.speechDetected ? '✓' : '—'}
                      </span>
                    </div>
                    {voice.transcript && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="font-mono-data text-[9px]" style={{ color: 'rgba(0,212,255,0.5)', letterSpacing: 1 }}>
                          METİN ✓
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PTT Butonu + Yazı girişi */}
            <div className="flex gap-3 items-center">

              {/* BÜYÜK Push-to-Talk butonu */}
              <button
                onClick={voice.toggleRecording}
                disabled={voice.status === 'processing' || isSpeaking}
                aria-label={voice.isRecording ? 'Kaydı durdur' : 'Konuşmaya başla'}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: voice.isRecording
                    ? '3px solid var(--pulsar-red)'
                    : '3px solid rgba(0,212,255,0.5)',
                  background: voice.isRecording
                    ? 'rgba(255,51,51,0.15)'
                    : 'rgba(0,212,255,0.08)',
                  color: voice.isRecording ? 'var(--pulsar-red)' : 'var(--pulsar-cyan)',
                  cursor: voice.status === 'processing' || isSpeaking ? 'not-allowed' : 'pointer',
                  opacity: voice.status === 'processing' || isSpeaking ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: voice.isRecording
                    ? '0 0 20px rgba(255,51,51,0.5)'
                    : '0 0 12px rgba(0,212,255,0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                {voice.isRecording && (
                  <>
                    <div className="mic-wave-ring mic-wave-ring-1" />
                    <div className="mic-wave-ring mic-wave-ring-2" />
                    <div className="mic-wave-ring mic-wave-ring-3" />
                  </>
                )}
                <Mic className="w-6 h-6 relative z-10" />
              </button>

              {/* Yazı girişi */}
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Yazarak da konuşabilirsiniz..."
                className="flex-1 h-10 text-sm font-mono-data"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--pulsar-border)',
                  color: 'var(--pulsar-text)',
                  letterSpacing: '0.5px',
                }}
                aria-label="Metin komutu girişi"
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
                aria-label="Komutu çalıştır"
              >
                GÖNDER
              </Button>
            </div>

            {/* Mikrofon hatası uyarısı */}
            {voice.permissionDenied && (
              <div className="mt-3 p-2 text-center font-mono-data text-[9px]" style={{ background: 'rgba(255,51,51,0.08)', border: '1px solid rgba(255,51,51,0.3)', color: 'var(--pulsar-red)', letterSpacing: 2 }}>
                ⚠ MİKROFON İZNİ REDDEDİLDİ — Tarayıcı adres çubuğundaki kilit ikonuna tıklayın
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-[300px] flex flex-col gap-3 flex-shrink-0 pointer-events-auto" style={{ minHeight: 0, overflow: 'hidden' }}>

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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ['--orbit-radius' as any]: `${sat.radius}px`,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      {/* ════ CİHAZ SEÇİM MODALI ════ */}
      <DeviceSelector
        open={showDeviceSelector}
        audioInputs={mediaDevices.audioInputs}
        audioOutputs={mediaDevices.audioOutputs}
        selectedMicId={mediaDevices.selectedMicId}
        selectedSpeakerId={mediaDevices.selectedSpeakerId}
        micLevel={mediaDevices.micLevel}
        onSelectMic={mediaDevices.selectMic}
        onSelectSpeaker={mediaDevices.selectSpeaker}
        startMicPreview={mediaDevices.startMicPreview}
        stopMicPreview={mediaDevices.stopMicPreview}
        testSpeaker={mediaDevices.testSpeaker}
        onConfirm={(micId, speakerId) => {
          mediaDevices.selectMic(micId);
          mediaDevices.selectSpeaker(speakerId);
          setShowDeviceSelector(false);
        }}
        onClose={() => setShowDeviceSelector(false)}
      />
    </div>
  );
}
