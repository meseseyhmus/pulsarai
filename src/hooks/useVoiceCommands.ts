/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from 'react';
import { askPulsarAI } from '@/lib/gemini';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'wakeword_detected'
  | 'processing'
  | 'speaking'
  | 'silent_mode'
  | 'standby'
  | 'error';

export interface VoiceCommandEvent {
  type: 'greeting' | 'status' | 'jamming' | 'last_alarm' | 'download' | 'silent' | 'shutdown' | 'help' | 'unknown' | 'no_speech';
  transcript: string;
  response: string;
}

export interface UseVoiceCommandsOptions {
  onTriggerJammingTest?: () => void;
  onOpenXAIPanel?: () => void;
  onDownloadEvidence?: () => void;
  getSystemStatus?: () => string;
  getLastAlarm?: () => string;
  getTrustScore?: () => number;
  onEventHandled?: (event: VoiceCommandEvent) => void;
}

const WAKE_WORDS = ['pulsar', 'jarvis'];

// Turkish responses
const RESPONSES = {
  greeting: (score: number) =>
    `Efendim, hoş geldiniz. Sistem normal operasyonda. Güven skoru ${score}.`,
  status: (status: string) => status,
  jamming: `Jamming simülasyonu başlatılıyor efendim. Red Team protokolü aktive edildi. Sonuçlar analiz edilecek.`,
  last_alarm: (alarm: string) =>
    `Son alarm kaydı: ${alarm}. Açıklayıcı panel açıldı efendim.`,
  download: `Delil paketi hazırlanıyor. JSON formatında dışa aktarılıyor efendim.`,
  silent_on: `Sessiz mod aktive edildi. Sesli yanıtlar devre dışı efendim.`,
  silent_off: `Sesli mod yeniden aktive edildi. Dinliyorum efendim.`,
  shutdown: `Sistemi bekleme moduna alıyorum efendim. Görüşmek üzere.`,
  help: `Mevcut komutlar: merhaba, sistem durumu, jamming testi başlat, son alarmı açıkla, delil paketini indir, sessiz mod, kapat.`,
  no_speech: `Sizi duyamadım, tekrar eder misiniz efendim?`,
  no_match: `Bu komutu anlayamadım. Yardım için "PULSAR, komutlar" diyebilirsiniz.`,
  mic_denied: `Mikrofon izni reddedildi. Ses komutları için mikrofon izni gereklidir.`,
  wakeword: `Evet efendim? Komutunuzu bekliyorum.`,
};

function matchCommand(transcript: string): VoiceCommandEvent['type'] | null {
  const t = transcript.toLowerCase().trim();

  if (t.includes('merhaba') || t.includes('hoş geldin') || t.includes('selam')) return 'greeting';
  if (
    t.includes('sistem durumu') ||
    t.includes('durum nedir') ||
    t.includes('durum raporu') ||
    t.includes('sistem raporu')
  )
    return 'status';
  if (
    t.includes('jamming') ||
    t.includes('red team') ||
    t.includes('saldırı testi') ||
    t.includes('test başlat')
  )
    return 'jamming';
  if (
    t.includes('son alarm') ||
    t.includes('alarm açıkla') ||
    t.includes('alarm detay') ||
    t.includes('son uyarı')
  )
    return 'last_alarm';
  if (
    t.includes('delil') ||
    t.includes('indir') ||
    t.includes('kaydet') ||
    t.includes('export')
  )
    return 'download';
  if (t.includes('sessiz') || t.includes('ses kapat') || t.includes('mute')) return 'silent';
  if (
    t.includes('kapat') ||
    t.includes('bekle') ||
    t.includes('bekleme') ||
    t.includes('sleep')
  )
    return 'shutdown';
  if (t.includes('komut') || t.includes('yardım') || t.includes('help')) return 'help';

  return null;
}

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const { onTriggerJammingTest, onOpenXAIPanel, onDownloadEvidence, getSystemStatus, getLastAlarm, getTrustScore, onEventHandled } = options;

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [lastEvent, setLastEvent] = useState<VoiceCommandEvent | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const wakeWordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continuousRef = useRef(false);
  const onEventHandledRef = useRef(onEventHandled);

  useEffect(() => {
    onEventHandledRef.current = onEventHandled;
  }, [onEventHandled]);

  // ── Init speech synthesis ──────────────────────────────────────────────────
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // ── Speak helper ──────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!synthRef.current) return;
      if (isSilentMode) {
        onEnd?.();
        return;
      }

      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'tr-TR';
      utter.rate = 0.9;
      utter.pitch = 1.0;
      utter.volume = 1;

      const setVoice = () => {
        const voices = synthRef.current!.getVoices();
        const preferred =
          voices.find(v => v.lang.startsWith('tr') && v.name.toLowerCase().includes('google')) ||
          voices.find(v => v.lang.startsWith('tr') && v.name.toLowerCase().includes('microsoft')) ||
          voices.find(v => v.lang.startsWith('tr')) ||
          voices[0];
        if (preferred) utter.voice = preferred;
      };

      if (speechSynthesis.getVoices().length > 0) {
        setVoice();
      } else {
        speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true });
      }

      utter.onstart = () => setStatus('speaking');
      utter.onend = () => {
        setStatus(continuousRef.current ? 'listening' : 'idle');
        onEnd?.();
      };
      utter.onerror = () => {
        setStatus(continuousRef.current ? 'listening' : 'idle');
        onEnd?.();
      };

      synthRef.current.speak(utter);
    },
    [isSilentMode]
  );

  // ── Process command after wake word ──────────────────────────────────────
  const processCommand = useCallback(
    async (rawTranscript: string) => {
      setTranscript(rawTranscript);
      setStatus('processing');

      // strip wake word from transcript
      let cmd = rawTranscript.toLowerCase();
      WAKE_WORDS.forEach(w => { cmd = cmd.replace(w, '').trim(); });

      const commandType = matchCommand(cmd);
      const score = getTrustScore?.() ?? 96;

      let response = '';
      let event: VoiceCommandEvent;

      switch (commandType) {
        case 'greeting':
          response = RESPONSES.greeting(score);
          event = { type: 'greeting', transcript: rawTranscript, response };
          break;

        case 'status': {
          const statusText =
            getSystemStatus?.() ??
            `Sistem durumu: Tüm katmanlar aktif. Güven skoru ${score}. Son alarm kaydı temiz.`;
          response = RESPONSES.status(statusText);
          event = { type: 'status', transcript: rawTranscript, response };
          break;
        }

        case 'jamming':
          response = RESPONSES.jamming;
          event = { type: 'jamming', transcript: rawTranscript, response };
          speak(response, () => onTriggerJammingTest?.());
          setLastEvent(event);
          setWakeWordDetected(false);
          return;

        case 'last_alarm': {
          const alarm = getLastAlarm?.() ?? 'GNSS spoofing girişimi tespit edildi, skor 0.89';
          response = RESPONSES.last_alarm(alarm);
          event = { type: 'last_alarm', transcript: rawTranscript, response };
          speak(response, () => onOpenXAIPanel?.());
          setLastEvent(event);
          setWakeWordDetected(false);
          return;
        }

        case 'download':
          response = RESPONSES.download;
          event = { type: 'download', transcript: rawTranscript, response };
          speak(response, () => onDownloadEvidence?.());
          setLastEvent(event);
          setWakeWordDetected(false);
          return;

        case 'silent':
          if (isSilentMode) {
            setIsSilentMode(false);
            response = RESPONSES.silent_off;
          } else {
            setIsSilentMode(true);
            response = RESPONSES.silent_on;
          }
          event = { type: 'silent', transcript: rawTranscript, response };
          break;

        case 'shutdown':
          response = RESPONSES.shutdown;
          event = { type: 'shutdown', transcript: rawTranscript, response };
          speak(response, () => {
            continuousRef.current = false;
            setStatus('standby');
          });
          setLastEvent(event);
          setWakeWordDetected(false);
          return;

        case 'help':
          response = RESPONSES.help;
          event = { type: 'help', transcript: rawTranscript, response };
          break;

        default:
          response = await askPulsarAI(rawTranscript, `Sistem Güven Skoru: ${score}`);
          event = { type: 'unknown', transcript: rawTranscript, response };
      }

      setLastEvent(event);
      if (onEventHandledRef.current) {
        onEventHandledRef.current(event);
      }
      setWakeWordDetected(false);
      speak(response);
    },
    [speak, isSilentMode, getTrustScore, getSystemStatus, getLastAlarm, onTriggerJammingTest, onOpenXAIPanel, onDownloadEvidence]
  );

  // ── Build recognition instance ────────────────────────────────────────────
  const buildRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const rec = new SpeechRecognitionAPI();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    return rec;
  }, []);

  // ── Start continuous listening ────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (continuousRef.current) return;

    const rec = buildRecognition();
    if (!rec) {
      setMicAvailable(false);
      return;
    }

    recognitionRef.current = rec;
    continuousRef.current = true;

    rec.onstart = () => setStatus('listening');

    rec.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const text = (finalTranscript || interimTranscript).toLowerCase().trim();
      setTranscript(text);

      const isFinal = finalTranscript.length > 0;

      // Wake word check
      const hasWakeWord = WAKE_WORDS.some(w => text.includes(w));

      if (hasWakeWord) {
        setWakeWordDetected(true);
        setStatus('wakeword_detected');
      }

      // If we have final speech, process it immediately (no wake word needed if they clicked the mic)
      if (isFinal && text.length > 1) {
        processCommand(text);
      } else if (isFinal && text.length <= 1) {
        const noSpeechEvt: VoiceCommandEvent = {
          type: 'no_speech',
          transcript: text,
          response: RESPONSES.no_speech,
        };
        setLastEvent(noSpeechEvt);
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setPermissionDenied(true);
        setMicAvailable(false);
        speak(RESPONSES.mic_denied);
        continuousRef.current = false;
        setStatus('error');
      } else if (e.error === 'no-speech') {
        // no-op; continuous will restart
      } else {
        setStatus('error');
      }
    };

    rec.onend = () => {
      if (continuousRef.current) {
        // auto-restart for true continuous mode
        try { rec.start(); } catch { /* already started */ }
      } else {
        setStatus('idle');
      }
    };

    try {
      rec.start();
    } catch {
      setStatus('error');
    }
  }, [buildRecognition, processCommand, speak]);

  // ── Stop listening ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    continuousRef.current = false;
    if (wakeWordTimerRef.current) clearTimeout(wakeWordTimerRef.current);
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    setStatus('idle');
    setWakeWordDetected(false);
    setTranscript('');
  }, []);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (status === 'standby' || status === 'idle') {
      startListening();
    } else {
      stopListening();
    }
  }, [status, startListening, stopListening]);

  // ── Manual speak (external use) ───────────────────────────────────────────
  const manualSpeak = useCallback((text: string) => speak(text), [speak]);

  return {
    status,
    lastEvent,
    transcript,
    isSilentMode,
    wakeWordDetected,
    permissionDenied,
    micAvailable,
    startListening,
    stopListening,
    toggleListening,
    speak: manualSpeak,
    setIsSilentMode,
  };
}
