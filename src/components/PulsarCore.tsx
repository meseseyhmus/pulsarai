import { useRef, useEffect, useCallback, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────
interface PulsarCoreProps {
  status: 'SECURE' | 'WARNING' | 'ATTACK';
  isSpeaking?: boolean;
  size?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
  hue: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
}

interface LightningPoint {
  x: number;
  y: number;
}

// ── Constants ────────────────────────────────────────────────────
const COLORS = {
  cyan: '#00f0ff',
  cyanMid: '#00cfff',
  blue: '#0088ff',
  cyanDim: 'rgba(0, 240, 255, 0.3)',
  red: '#ff3333',
  amber: '#f59e0b',
  white: '#ffffff',
};

// ── Helper functions ─────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateLightningArc(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  cx: number,
  cy: number,
  segments: number = 8
): LightningPoint[] {
  const points: LightningPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = lerp(startAngle, endAngle, t);
    const radius = lerp(innerRadius, outerRadius, t);
    const jitter = (Math.random() - 0.5) * 12;
    const jitterAngle = (Math.random() - 0.5) * 0.15;
    points.push({
      x: cx + Math.cos(angle + jitterAngle) * (radius + jitter),
      y: cy + Math.sin(angle + jitterAngle) * (radius + jitter),
    });
  }
  return points;
}

// ── Component ────────────────────────────────────────────────────
export default function PulsarCore({ status, isSpeaking = false, size = 380 }: PulsarCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const timeRef = useRef<number>(0);
  const hoverRef = useRef<boolean>(false);
  const clickBurstRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  const cx = size / 2;
  const cy = size / 2;

  // ── Status-based colors ──────────────────────────────────────
  const getStatusColor = useCallback(() => {
    switch (status) {
      case 'ATTACK': return COLORS.red;
      case 'WARNING': return COLORS.amber;
      default: return COLORS.cyan;
    }
  }, [status]);

  const getStatusGlow = useCallback(() => {
    switch (status) {
      case 'ATTACK': return 'rgba(255, 51, 51, 0.4)';
      case 'WARNING': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(0, 240, 255, 0.35)';
    }
  }, [status]);

  // ── Particle system ──────────────────────────────────────────
  const spawnParticle = useCallback((burst: boolean = false) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = burst ? randomRange(20, 60) : randomRange(40, size * 0.42);
    const speed = burst ? randomRange(1.5, 4) : randomRange(0.1, 0.5);
    const outward = burst ? 1 : (Math.random() > 0.5 ? 1 : -1);

    particlesRef.current.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: Math.cos(angle) * speed * outward + (Math.random() - 0.5) * 0.3,
      vy: Math.sin(angle) * speed * outward + (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: burst ? randomRange(30, 60) : randomRange(80, 200),
      size: burst ? randomRange(1.5, 4) : randomRange(0.5, 2.5),
      opacity: burst ? 1 : randomRange(0.3, 0.8),
      hue: status === 'ATTACK' ? 0 : status === 'WARNING' ? 40 : randomRange(180, 200),
    });
  }, [cx, cy, size, status]);

  // ── Add ripple ───────────────────────────────────────────────
  const addRipple = useCallback((burst: boolean = false) => {
    ripplesRef.current.push({
      x: cx,
      y: cy,
      radius: burst ? 10 : 30,
      maxRadius: burst ? size * 0.6 : size * 0.48,
      opacity: burst ? 0.7 : 0.3,
      speed: burst ? 3.5 : 1.2,
    });
  }, [cx, cy, size]);

  // ── Click burst ──────────────────────────────────────────────
  const handleClick = useCallback(() => {
    clickBurstRef.current = 1.0;
    // Spawn burst particles
    for (let i = 0; i < 40; i++) {
      spawnParticle(true);
    }
    // Add burst ripples
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addRipple(true), i * 100);
    }
  }, [spawnParticle, addRipple]);

  // ── Main render loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const statusColor = getStatusColor();
    const statusGlow = getStatusGlow();
    const isHov = hoverRef.current;

    const render = (timestamp: number) => {
      // Delta time for smooth animation
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      lastFrameRef.current = timestamp;

      const speakSpeed = isSpeaking ? 2.6 : 1.0;
      timeRef.current += 0.016 * (isHov ? 1.8 : 1.0) * speakSpeed;
      const t = timeRef.current;

      // Clear
      ctx.clearRect(0, 0, size, size);

      // ── Background radial gradient ───────────────────────────
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
      bgGrad.addColorStop(0, 'rgba(0, 20, 40, 0.3)');
      bgGrad.addColorStop(0.5, 'rgba(0, 10, 25, 0.15)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // ── Heat distortion effect (subtle) ──────────────────────
      const distortionIntensity = 0.3 + clickBurstRef.current * 2;
      ctx.save();
      if (distortionIntensity > 0.35) {
        const offsetX = Math.sin(t * 3) * distortionIntensity;
        const offsetY = Math.cos(t * 2.7) * distortionIntensity;
        ctx.translate(offsetX, offsetY);
      }

      // ── Outer glow (bloom effect) ────────────────────────────
      const speakGlow = isSpeaking ? 0.25 + Math.sin(t * 8) * 0.15 : 0;
      const glowIntensity = 0.15 + Math.sin(t * 1.5) * 0.08 + (isHov ? 0.12 : 0) + clickBurstRef.current * 0.3 + speakGlow;
      const outerGlow = ctx.createRadialGradient(cx, cy, size * 0.15, cx, cy, size * 0.48);
      outerGlow.addColorStop(0, `rgba(0, 240, 255, ${glowIntensity * 0.6})`);
      outerGlow.addColorStop(0.4, `rgba(0, 207, 255, ${glowIntensity * 0.3})`);
      outerGlow.addColorStop(0.7, `rgba(0, 136, 255, ${glowIntensity * 0.1})`);
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // ── Ripple effects ───────────────────────────────────────
      ripplesRef.current = ripplesRef.current.filter(r => r.opacity > 0.01);
      ripplesRef.current.forEach(ripple => {
        ripple.radius += ripple.speed;
        ripple.opacity *= 0.97;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = status === 'ATTACK'
          ? `rgba(255, 51, 51, ${ripple.opacity})`
          : `rgba(0, 240, 255, ${ripple.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Periodic ripple
      if (Math.random() < 0.008 + (isHov ? 0.01 : 0)) {
        addRipple();
      }

      // ── Ring 1 — Outer (slow, clockwise) ─────────────────────
      const ring1Radius = size * 0.46;
      const ring1Speed = isSpeaking ? 0.9 : (isHov ? 0.4 : 0.2);
      const ring1Angle = t * ring1Speed;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ring1Angle);

      // Dashed segmented ring
      const ring1Segments = 60;
      for (let i = 0; i < ring1Segments; i++) {
        const segAngle = (i / ring1Segments) * Math.PI * 2;
        const segLen = Math.PI * 2 / ring1Segments * 0.6;
        const opacity = 0.15 + Math.sin(segAngle * 3 + t * 2) * 0.1;

        ctx.beginPath();
        ctx.arc(0, 0, ring1Radius, segAngle, segAngle + segLen);
        ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Ring 1 accent arcs
      for (let i = 0; i < 4; i++) {
        const arcStart = (i / 4) * Math.PI * 2 + t * 0.3;
        const arcLen = 0.3 + Math.sin(t + i) * 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, ring1Radius, arcStart, arcStart + arcLen);
        const grad = ctx.createConicGradient(arcStart, 0, 0);
        grad.addColorStop(0, statusColor);
        grad.addColorStop(0.5, 'rgba(0,240,255,0.5)');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = statusGlow;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Tick marks
      for (let i = 0; i < 72; i++) {
        const tickAngle = (i / 72) * Math.PI * 2;
        const isMajor = i % 9 === 0;
        const tickLen = isMajor ? 8 : 4;
        const outerR = ring1Radius + 4;

        ctx.beginPath();
        ctx.moveTo(Math.cos(tickAngle) * outerR, Math.sin(tickAngle) * outerR);
        ctx.lineTo(Math.cos(tickAngle) * (outerR + tickLen), Math.sin(tickAngle) * (outerR + tickLen));
        ctx.strokeStyle = isMajor ? `rgba(0, 240, 255, 0.4)` : `rgba(0, 240, 255, 0.12)`;
        ctx.lineWidth = isMajor ? 1.5 : 0.5;
        ctx.stroke();
      }

      ctx.restore();

      // ── Ring 2 — Middle (medium, counter-clockwise) ──────────
      const ring2Radius = size * 0.36;
      const ring2Speed = isSpeaking ? -1.4 : (isHov ? -0.6 : -0.35);
      const ring2Angle = t * ring2Speed;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ring2Angle);

      // Hexagonal segments
      const hex = 6;
      for (let i = 0; i < hex; i++) {
        const a1 = (i / hex) * Math.PI * 2;
        const a2 = ((i + 1) / hex) * Math.PI * 2;
        const breathe = Math.sin(t * 1.8 + i) * 3;

        ctx.beginPath();
        ctx.arc(0, 0, ring2Radius + breathe, a1 + 0.05, a2 - 0.05);
        const segOpacity = 0.2 + Math.sin(t * 2 + i * 1.2) * 0.15;
        ctx.strokeStyle = `rgba(0, 207, 255, ${segOpacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Data notch marks on each segment
        const midAngle = (a1 + a2) / 2;
        const notchR1 = ring2Radius - 6;
        const notchR2 = ring2Radius + 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(midAngle) * notchR1, Math.sin(midAngle) * notchR1);
        ctx.lineTo(Math.cos(midAngle) * notchR2, Math.sin(midAngle) * notchR2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Inner detail ring
      ctx.beginPath();
      ctx.arc(0, 0, ring2Radius - 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 136, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      // ── Ring 3 — Inner (fast, clockwise) ─────────────────────
      const ring3Radius = size * 0.26;
      const ring3Speed = isSpeaking ? 2.2 : (isHov ? 0.9 : 0.5);
      const ring3Angle = t * ring3Speed;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ring3Angle);

      // Triangle markers
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const triSize = 6;
        const r = ring3Radius;

        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r + triSize), Math.sin(a) * (r + triSize));
        ctx.lineTo(Math.cos(a - 0.04) * (r - triSize), Math.sin(a - 0.04) * (r - triSize));
        ctx.lineTo(Math.cos(a + 0.04) * (r - triSize), Math.sin(a + 0.04) * (r - triSize));
        ctx.closePath();
        ctx.fillStyle = statusColor;
        ctx.shadowColor = statusGlow;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Continuous glow arc
      const arcGlowStart = t * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, ring3Radius, arcGlowStart, arcGlowStart + Math.PI * 0.8);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = statusGlow;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Thin detail ring
      ctx.beginPath();
      ctx.arc(0, 0, ring3Radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // ── Lightning arcs between rings ─────────────────────────
      const lightningCount = isSpeaking ? 6 : (isHov ? 4 : 2);
      const lightningChance = 0.03 + clickBurstRef.current * 0.2 + (isSpeaking ? 0.12 : 0);

      for (let i = 0; i < lightningCount; i++) {
        if (Math.random() < lightningChance) {
          const startAngle = Math.random() * Math.PI * 2;
          const endAngle = startAngle + randomRange(0.3, 0.8) * (Math.random() > 0.5 ? 1 : -1);

          // Between ring 1 and ring 2
          if (Math.random() > 0.5) {
            const arc = generateLightningArc(startAngle, endAngle, ring2Radius + 5, ring1Radius - 5, cx, cy, 6);
            drawLightning(ctx, arc, statusColor, 0.6 + clickBurstRef.current * 0.3);
          } else {
            // Between ring 2 and ring 3
            const arc = generateLightningArc(startAngle, endAngle, ring3Radius + 5, ring2Radius - 5, cx, cy, 5);
            drawLightning(ctx, arc, statusColor, 0.5 + clickBurstRef.current * 0.3);
          }
        }
      }

      // ── Core lightning (from center to ring 3) ───────────────
      if (Math.random() < 0.02 + clickBurstRef.current * 0.15) {
        const angle = Math.random() * Math.PI * 2;
        const arc = generateLightningArc(angle, angle + randomRange(-0.2, 0.2), 25, ring3Radius - 8, cx, cy, 4);
        drawLightning(ctx, arc, COLORS.white, 0.4);
      }

      // ── Inner static ring ────────────────────────────────────
      const innerRingR = size * 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRingR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Core circle (the reactor heart) ──────────────────────
      const coreRadius = size * 0.16;
      const speakPulse = isSpeaking ? Math.sin(t * 12) * 0.07 + 0.06 : 0;
      const corePulse = 1 + Math.sin(t * 2) * 0.03 + clickBurstRef.current * 0.08 + speakPulse;
      const actualCoreR = coreRadius * corePulse;

      // Core background
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, actualCoreR);
      coreGrad.addColorStop(0, status === 'ATTACK' ? 'rgba(255, 51, 51, 0.2)' : 'rgba(0, 240, 255, 0.2)');
      coreGrad.addColorStop(0.5, status === 'ATTACK' ? 'rgba(255, 51, 51, 0.08)' : 'rgba(0, 207, 255, 0.08)');
      coreGrad.addColorStop(1, 'rgba(6, 14, 30, 0.95)');
      ctx.beginPath();
      ctx.arc(cx, cy, actualCoreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Core border
      ctx.beginPath();
      ctx.arc(cx, cy, actualCoreR, 0, Math.PI * 2);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = statusGlow;
      ctx.shadowBlur = 20 + clickBurstRef.current * 30;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Core inner glow
      const innerGlow = ctx.createRadialGradient(cx, cy - actualCoreR * 0.2, 0, cx, cy, actualCoreR * 0.8);
      innerGlow.addColorStop(0, `rgba(0, 240, 255, ${0.15 + Math.sin(t * 3) * 0.05})`);
      innerGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, actualCoreR * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();

      // ── Core crosshair ───────────────────────────────────────
      const crossSize = actualCoreR * 0.5;
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + Math.sin(t * 2) * 0.1})`;
      ctx.lineWidth = 1;

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(cx - crossSize, cy);
      ctx.lineTo(cx - crossSize * 0.3, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + crossSize * 0.3, cy);
      ctx.lineTo(cx + crossSize, cy);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(cx, cy - crossSize);
      ctx.lineTo(cx, cy - crossSize * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + crossSize * 0.3);
      ctx.lineTo(cx, cy + crossSize);
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.shadowColor = statusGlow;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Core text ────────────────────────────────────────────
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = `bold ${Math.round(size * 0.023)}px 'Orbitron', 'Courier New', monospace`;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.5 + Math.sin(t * 1.5) * 0.15})`;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
      ctx.shadowBlur = 6;
      ctx.fillText('P.U.L.S.A.R', cx, cy - 8);

      ctx.font = `${Math.round(size * 0.02)}px 'Courier New', monospace`;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.3 + Math.sin(t * 1.5 + 0.5) * 0.1})`;
      ctx.fillText('C.O.R.E', cx, cy + 8);
      ctx.shadowBlur = 0;

      // ── Speaking waveform overlay ─────────────────────────────
      if (isSpeaking) {
        ctx.save();

        // ── Layer 1: 7 organic blob waves around the core ────────
        const waveBaseR = actualCoreR + 8;
        for (let wave = 0; wave < 7; wave++) {
          const waveR = waveBaseR + wave * 20 + Math.sin(t * 4 + wave * 1.5) * 10;
          // amplitude scales up per wave then back down for organic feel
          const amp = (14 + wave * 6) * (1 + Math.sin(t * 5 + wave) * 0.4);
          const freq = 8 + wave * 1.5;
          const freq2 = freq * 0.55;
          const freq3 = freq * 1.7;

          ctx.beginPath();
          const step = 0.025; // high resolution
          for (let a = 0; a <= Math.PI * 2 + step; a += step) {
            const wobble =
              Math.sin(a * freq  + t * 9  + wave * 2.3) * amp +
              Math.sin(a * freq2 + t * 13 + wave * 1.1) * amp * 0.5 +
              Math.sin(a * freq3 + t * 6  + wave * 3.0) * amp * 0.25;
            const r = Math.max(actualCoreR * 1.05, waveR + wobble);
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          // stroke with strong glow
          const alpha = (0.75 - wave * 0.08) * (0.65 + Math.sin(t * 8 + wave) * 0.35);
          ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0.08, alpha)})`;
          ctx.lineWidth = wave < 2 ? 3 : wave < 4 ? 2 : 1.5;
          ctx.shadowColor = 'rgba(0, 240, 255, 0.9)';
          ctx.shadowBlur = wave < 2 ? 22 : 10;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // fill innermost wave for solid plasma look
          if (wave === 0) {
            ctx.fillStyle = `rgba(0, 240, 255, ${0.07 + Math.sin(t * 7) * 0.04})`;
            ctx.fill();
          }
        }

        // ── Layer 2: Radial audio-bar spikes from core edge ──────
        const barCount = 48;
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2;
          // each bar height driven by multiple harmonics = realistic equalizer
          const barH =
            (Math.abs(Math.sin(i * 0.9  + t * 11)) * 30 +
             Math.abs(Math.sin(i * 1.7  + t * 7))  * 20 +
             Math.abs(Math.sin(i * 2.3  + t * 15)) * 12) *
            (0.7 + Math.sin(t * 3 + i * 0.2) * 0.3);

          const innerR = actualCoreR + 4;
          const outerR = innerR + barH;
          const barAlpha = 0.5 + Math.sin(t * 9 + i * 0.4) * 0.3;

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
          ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
          ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0.1, barAlpha)})`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // ── Layer 3: Expanding pulse rings ────────────────────────
        const pulseCount = 3;
        for (let p = 0; p < pulseCount; p++) {
          const phase = ((t * 0.9 + p / pulseCount) % 1);
          const pulseR = actualCoreR + phase * size * 0.44;
          const pulseAlpha = (1 - phase) * 0.55;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 240, 255, ${pulseAlpha})`;
          ctx.lineWidth = 2.5 * (1 - phase) + 0.5;
          ctx.shadowColor = 'rgba(0, 240, 255, 0.7)';
          ctx.shadowBlur = 16 * (1 - phase);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }

      // ── Particles ────────────────────────────────────────────
      // Spawn ambient particles (more during speaking)
      if (Math.random() < 0.15 + (isHov ? 0.15 : 0) + (isSpeaking ? 0.3 : 0)) {
        spawnParticle();
      }

      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      particlesRef.current.forEach(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(lifeRatio * 5, 1);
        const fadeOut = 1 - Math.pow(lifeRatio, 2);
        const alpha = p.opacity * fadeIn * fadeOut;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Gradient shader movement (rotating gradient overlay) ─
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.04 + Math.sin(t) * 0.02;
      const shaderGrad = ctx.createConicGradient(t * 0.5, cx, cy);
      shaderGrad.addColorStop(0, '#00f0ff');
      shaderGrad.addColorStop(0.25, '#0088ff');
      shaderGrad.addColorStop(0.5, '#00f0ff');
      shaderGrad.addColorStop(0.75, '#0088ff');
      shaderGrad.addColorStop(1, '#00f0ff');
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = shaderGrad;
      ctx.fill();
      ctx.restore();

      // ── Decay click burst ────────────────────────────────────
      if (clickBurstRef.current > 0) {
        clickBurstRef.current *= 0.95;
        if (clickBurstRef.current < 0.01) clickBurstRef.current = 0;
      }

      ctx.restore(); // End distortion

      // ── HUD data readouts around the rings ───────────────────
      ctx.save();
      ctx.font = `${Math.round(size * 0.018)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';

      const dataPoints = [
        { angle: -Math.PI * 0.25, text: 'PWR 98.7%', color: COLORS.cyan },
        { angle: Math.PI * 0.25, text: 'FREQ 1.575GHz', color: COLORS.cyanMid },
        { angle: Math.PI * 0.75, text: 'SNR +42dB', color: COLORS.cyan },
        { angle: -Math.PI * 0.75, text: 'LOCK ✓', color: status === 'ATTACK' ? COLORS.red : COLORS.cyan },
      ];

      dataPoints.forEach(dp => {
        const r = ring1Radius + 22;
        const x = cx + Math.cos(dp.angle) * r;
        const y = cy + Math.sin(dp.angle) * r;
        const flicker = Math.sin(t * 3 + dp.angle) > 0.9 ? 0.3 : 0.6;

        ctx.fillStyle = dp.color;
        ctx.globalAlpha = flicker;
        ctx.fillText(dp.text, x, y);
      });

      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [size, cx, cy, status, isSpeaking, getStatusColor, getStatusGlow, addRipple, spawnParticle]);

  // ── Draw lightning helper ──────────────────────────────────────
  function drawLightning(ctx: CanvasRenderingContext2D, points: LightningPoint[], color: string, opacity: number) {
    if (points.length < 2) return;

    // Main bolt
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = opacity;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Bright core
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = opacity * 0.6;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  return (
    <div
      className="pulsar-core-wrapper"
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={() => { hoverRef.current = true; setIsHovered(true); }}
      onMouseLeave={() => { hoverRef.current = false; setIsHovered(false); }}
      onClick={handleClick}
      role="img"
      aria-label="PULSAR Core Enerji Reaktörü"
    >
      {/* Ambient CSS glow behind canvas */}
      <div
        className="pulsar-core-ambient-glow"
        style={{
          position: 'absolute',
          inset: -30,
          borderRadius: '50%',
          background: status === 'ATTACK'
            ? 'radial-gradient(circle, rgba(255,51,51,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)',
          filter: `blur(20px)`,
          transition: 'all 0.5s ease',
          opacity: isHovered ? 1.3 : 0.8,
          animation: 'pulsar-ambient-pulse 3s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          display: 'block',
        }}
      />

      {/* Status indicator below core */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: getStatusColor(),
            boxShadow: `0 0 8px ${getStatusGlow()}`,
            animation: status === 'ATTACK' ? 'pulsar-status-blink 0.5s infinite' : 'pulsar-status-blink 2s infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'Orbitron', 'Courier New', monospace",
            fontSize: 9,
            color: getStatusColor(),
            letterSpacing: 3,
            opacity: 0.7,
          }}
        >
          {status === 'ATTACK' ? 'THREAT DETECTED' : status === 'WARNING' ? 'ANOMALY SCAN' : 'SYSTEM NOMINAL'}
        </span>
      </div>
    </div>
  );
}
