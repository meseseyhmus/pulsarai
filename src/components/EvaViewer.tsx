/* eslint-disable react-hooks/immutability, react-hooks/purity, @typescript-eslint/no-explicit-any */
import { useRef, useEffect, Suspense, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

// ── Types ────────────────────────────────────────────────────────
interface EvaViewerProps {
  isSpeaking?: boolean;
  status?: 'SECURE' | 'WARNING' | 'ATTACK';
  size?: number | string;
  responseText?: string;
}

// ── Status color maps ────────────────────────────────────────────
const STATUS_EMISSIVE: Record<string, THREE.Color> = {
  SECURE: new THREE.Color(0x00f0ff),
  WARNING: new THREE.Color(0xf59e0b),
  ATTACK: new THREE.Color(0xff3333),
};

const STATUS_COLORS: Record<string, string> = {
  SECURE: '#00f0ff',
  WARNING: '#f59e0b',
  ATTACK: '#ff3333',
};

// ── Shader: Holographic Ring ─────────────────────────────────────
const holoRingVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const holoRingFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSpeed;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    float angle = atan(vPosition.x, vPosition.z);
    float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);

    // Animated segments
    float segments = 30.0;
    float seg = fract(normalizedAngle * segments + uTime * uSpeed);
    float segAlpha = smoothstep(0.0, 0.15, seg) * smoothstep(0.85, 0.7, seg);

    // Flowing energy pulse
    float pulse = sin(normalizedAngle * 12.0 - uTime * 3.0 * uSpeed) * 0.5 + 0.5;
    float pulse2 = sin(normalizedAngle * 8.0 + uTime * 2.0 * uSpeed) * 0.5 + 0.5;

    // Combine
    float alpha = segAlpha * 0.4 + pulse * 0.35 + pulse2 * 0.15;
    alpha *= uOpacity;

    // Edge glow
    float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    alpha *= edgeFade;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ── Shader: Energy Field ─────────────────────────────────────────
const energyFieldVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const energyFieldFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    // Fresnel effect — edges glow brighter
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);

    // Animated noise pattern
    float noise1 = sin(vUv.x * 20.0 + uTime * 2.0) * cos(vUv.y * 15.0 - uTime * 1.5);
    float noise2 = sin(vUv.x * 35.0 - uTime * 3.0) * cos(vUv.y * 25.0 + uTime * 2.5);
    float noise = noise1 * 0.5 + noise2 * 0.3 + 0.5;

    float alpha = fresnel * (0.15 + noise * 0.1) * uIntensity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ── Component: Eva AI Model (Using useFrame for animation) ─────────
function EvaModel({ isSpeaking, status }: { isSpeaking: boolean; status: 'SECURE' | 'WARNING' | 'ATTACK' }) {
  const { nodes, materials } = useGLTF('/eva.glb') as any;
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const speakTransition = useRef(0);

  // Safely clone root material once so we can manipulate emissives independently of the GLB cache
  const clonedMat = useMemo(() => {
    const rootMat = materials['Scene_-_Root'] as THREE.MeshStandardMaterial;
    return rootMat ? rootMat.clone() : new THREE.MeshStandardMaterial();
  }, [materials]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const grp = groupRef.current;
    if (!grp) return;

    // Smooth speaking transition
    const speakTarget = isSpeaking ? 1 : 0;
    speakTransition.current += (speakTarget - speakTransition.current) * delta * 4;
    const sp = Math.max(0, Math.min(1, speakTransition.current)); // safely clamp

    // ── Expressive Position ─────────────────────────────────────
    const floatY = Math.sin(t * 1.2) * 0.05 + Math.sin(t * 0.7) * 0.02;
    const speakFloatY = Math.sin(t * 8) * 0.04;
    grp.position.y = floatY + (speakFloatY * sp) - 0.6; // -0.6 for centering the Y offset of the nodes

    // ── Expressive Rotation ─────────────────────────────────────
    const attackWobbleY = status === 'ATTACK' ? Math.sin(t * 20) * 0.1 : 0;
    const attackWobbleZ = status === 'ATTACK' ? Math.sin(t * 4) * 0.1 : 0;
    const attackWobbleX = status === 'ATTACK' ? Math.cos(t * 3) * 0.05 : 0;

    const lookX = 0.05 + Math.sin(t * 5.0) * 0.05; 
    const lookY = Math.sin(t * 3.5) * 0.25; 
    const lookZ = Math.sin(t * 4.2) * 0.06; 

    grp.rotation.y = (lookY * sp) + attackWobbleY + (Math.sin(t * 0.8) * 0.15 * (1-sp));
    grp.rotation.x = (lookX * sp) + attackWobbleX + (Math.sin(t * 1.2) * 0.04 * (1-sp));
    grp.rotation.z = (lookZ * sp) + attackWobbleZ + (Math.cos(t * 0.6) * 0.02 * (1-sp));

    // ── Scale pulse ─────────────────────────────────────────────
    const idlePulse = 1 + Math.sin(t * 1.5) * 0.008;
    const speakPulse = Math.sin(t * 10) * 0.04 + Math.sin(t * 14) * 0.02;
    const attackPulse = status === 'ATTACK' ? Math.sin(t * 8) * 0.03 : 0;
    const currentScale = Math.max(0.1, idlePulse + (speakPulse * sp) + attackPulse);
    // Base scale is 0.45, apply dynamic pulse on top of it.
    grp.scale.setScalar(0.45 * currentScale);

    // ── Emissive glow ───────────────────────────────────────────
    if (clonedMat) {
      const targetEmissive = STATUS_EMISSIVE[status] || STATUS_EMISSIVE.SECURE;
      const idleIntensity = 0.1 + Math.sin(t * 2) * 0.04;
      const speakIntensity = 0.5 + Math.sin(t * 8) * 0.3 + Math.sin(t * 12) * 0.15;
      const attackIntensity = status === 'ATTACK' ? 0.3 + Math.sin(t * 6) * 0.2 : 0;
      const emissiveIntensity = idleIntensity + sp * (speakIntensity - idleIntensity) + attackIntensity;
      
      clonedMat.emissive.lerp(targetEmissive, 0.1);
      clonedMat.emissiveIntensity = Math.max(0, emissiveIntensity);
    }
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.1}
      floatIntensity={0.2}
      floatingRange={[-0.02, 0.02]}
    >
      <group ref={groupRef} position={[-0.2, -0.6, 0]}>
        <group position={[0.743, 2.136, -0.239]} rotation={[0.058, 0.025, 0.009]}>
          <mesh geometry={nodes.body__0?.geometry} material={clonedMat} />
          <mesh geometry={nodes.body__0_1?.geometry} material={clonedMat} />
        </group>
        <mesh geometry={nodes.head_screen___0?.geometry} material={clonedMat} position={[0.566, 1.65, -0.324]} rotation={[0.231, 0.174, -0.153]} />
        <mesh geometry={nodes.eyes__0?.geometry} material={clonedMat} position={[0.63, 2.47, 0.742]} rotation={[0.114, -0.198, -0.316]} />
        <mesh geometry={nodes.head_white___0?.geometry} material={clonedMat} position={[0.581, 1.69, -0.292]} rotation={[0.243, 0.147, -0.155]} />
        <mesh geometry={nodes.arm__0?.geometry} material={clonedMat} position={[-0.316, 1.092, -0.285]} rotation={[0.104, 0.083, -0.316]} />
      </group>
    </Float>
  );
}

// ── Component: Holographic Ring ──────────────────────────────────
function HoloRing({
  radius,
  rotationSpeed,
  tilt,
  color,
  opacity,
  isSpeaking,
  thickness = 0.02,
}: {
  radius: number;
  rotationSpeed: number;
  tilt: [number, number, number];
  color: THREE.Color;
  opacity: number;
  isSpeaking: boolean;
  thickness?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const timeRef = useRef(0);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: color },
    uOpacity: { value: opacity },
    uSpeed: { value: 1.0 },
  }), [color, opacity]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!meshRef.current || !materialRef.current) return;

    const speed = isSpeaking ? rotationSpeed * 3 : rotationSpeed;
    meshRef.current.rotation.y += delta * speed;

    materialRef.current.uniforms.uTime.value = timeRef.current;
    materialRef.current.uniforms.uColor.value = color;
    materialRef.current.uniforms.uSpeed.value = isSpeaking ? 3.0 : 1.0;
    materialRef.current.uniforms.uOpacity.value = isSpeaking
      ? opacity * (1.2 + Math.sin(timeRef.current * 6) * 0.3)
      : opacity;
  });

  return (
    <mesh ref={meshRef} rotation={tilt}>
      <torusGeometry args={[radius, thickness, 16, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={holoRingVertexShader}
        fragmentShader={holoRingFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Component: Scan Ring (flat rotating ring) ────────────────────
function ScanRing({
  isSpeaking,
  status,
  radius = 1.0,
  y = -0.6,
}: {
  isSpeaking: boolean;
  status: string;
  radius?: number;
  y?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (!meshRef.current) return;

    meshRef.current.rotation.z += delta * (isSpeaking ? 2.0 : 0.5);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = isSpeaking
      ? 0.2 + Math.sin(t.current * 6) * 0.12
      : 0.06 + Math.sin(t.current * 1.5) * 0.03;

    // Pulse scale when speaking
    const scale = 1 + (isSpeaking ? Math.sin(t.current * 4) * 0.05 : 0);
    meshRef.current.scale.setScalar(scale);
  });

  const color = STATUS_COLORS[status] || '#00f0ff';

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[radius * 0.85, radius, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Component: Orbital Particles ─────────────────────────────────
function OrbitalParticles({
  count = 80,
  isSpeaking,
  status,
}: {
  count?: number;
  isSpeaking: boolean;
  status: string;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 1.2;
      const height = (Math.random() - 0.5) * 1.5;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    return { positions: pos, velocities: vel };
  }, [count]);

  const color = useMemo(() => {
    return new THREE.Color(STATUS_COLORS[status] || '#00f0ff');
  }, [status]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const speedMult = isSpeaking ? 4 : 1;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = posArray[idx];
      const z = posArray[idx + 2];

      // Orbit around Y axis
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);
      const newAngle = angle + delta * (0.3 + velocities[idx] * 10) * speedMult;

      posArray[idx] = Math.cos(newAngle) * radius;
      posArray[idx + 1] += velocities[idx + 1] * speedMult;
      posArray[idx + 2] = Math.sin(newAngle) * radius;

      // Bounce height
      if (Math.abs(posArray[idx + 1]) > 1.0) {
        velocities[idx + 1] *= -1;
      }
    }

    posAttr.needsUpdate = true;

    // Pulsate size
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.size = isSpeaking
      ? 0.025 + Math.sin(timeRef.current * 8) * 0.01
      : 0.018;
    mat.color.lerp(color, 0.1);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.018}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ── Component: Energy Field (Fresnel sphere) ─────────────────────
function EnergyField({
  isSpeaking,
  status,
}: {
  isSpeaking: boolean;
  status: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const timeRef = useRef(0);

  const color = useMemo(() => new THREE.Color(STATUS_COLORS[status] || '#00f0ff'), [status]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: color },
    uIntensity: { value: 0.6 },
  }), [color]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!matRef.current || !meshRef.current) return;

    matRef.current.uniforms.uTime.value = timeRef.current;
    matRef.current.uniforms.uColor.value = color;
    matRef.current.uniforms.uIntensity.value = isSpeaking
      ? 1.2 + Math.sin(timeRef.current * 6) * 0.4
      : 0.5 + Math.sin(timeRef.current * 1.5) * 0.15;

    // Scale pulse
    const scale = isSpeaking
      ? 1.02 + Math.sin(timeRef.current * 8) * 0.03
      : 1.0 + Math.sin(timeRef.current * 1.2) * 0.005;
    meshRef.current.scale.setScalar(scale);
    meshRef.current.rotation.y += delta * 0.2;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.75, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={energyFieldVertexShader}
        fragmentShader={energyFieldFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Component: Adaptive Lights ───────────────────────────────────
function AdaptiveLights({
  isSpeaking,
  status,
}: {
  isSpeaking: boolean;
  status: string;
}) {
  const light1Ref = useRef<THREE.PointLight>(null!);
  const light2Ref = useRef<THREE.PointLight>(null!);
  const light3Ref = useRef<THREE.PointLight>(null!);
  const timeRef = useRef(0);

  const mainColor = STATUS_COLORS[status] || '#00f0ff';

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (light1Ref.current) {
      light1Ref.current.intensity = isSpeaking
        ? 2.0 + Math.sin(t * 8) * 1.0
        : 1.2 + Math.sin(t * 1.5) * 0.3;
    }

    if (light2Ref.current) {
      light2Ref.current.intensity = isSpeaking
        ? 1.5 + Math.cos(t * 6) * 0.8
        : 0.6;
    }

    // Speaking spotlight effect
    if (light3Ref.current) {
      light3Ref.current.intensity = isSpeaking
        ? 3.0 + Math.sin(t * 10) * 1.5
        : 0;
      light3Ref.current.position.x = Math.cos(t * 2) * 1.5;
      light3Ref.current.position.z = Math.sin(t * 2) * 1.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight
        ref={light1Ref}
        position={[2, 3, 2]}
        intensity={1.2}
        color={mainColor}
        distance={8}
        decay={2}
      />
      <pointLight
        ref={light2Ref}
        position={[-2, 1, -1]}
        intensity={0.6}
        color="#0088ff"
        distance={6}
        decay={2}
      />
      <pointLight
        ref={light3Ref}
        position={[0, 0, 2]}
        intensity={0}
        color={mainColor}
        distance={4}
        decay={2}
      />
    </>
  );
}

// ── Component: Audio Visualizer Bars (radial) ────────────────────
function AudioBars({
  isSpeaking,
  status,
}: {
  isSpeaking: boolean;
  status: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const timeRef = useRef(0);
  const barCount = 36;

  const color = useMemo(() => new THREE.Color(STATUS_COLORS[status] || '#00f0ff'), [status]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.3;

    barsRef.current.forEach((bar, i) => {
      if (!bar) return;
      const angle = (i / barCount) * Math.PI * 2;

      if (isSpeaking) {
        // Audio visualizer heights
        const h1 = Math.abs(Math.sin(i * 0.9 + t * 9)) * 0.3;
        const h2 = Math.abs(Math.sin(i * 1.7 + t * 6)) * 0.2;
        const h3 = Math.abs(Math.sin(i * 2.3 + t * 13)) * 0.12;
        const height = (h1 + h2 + h3) * (0.7 + Math.sin(t * 3 + i * 0.2) * 0.3);

        bar.scale.y = 1 + height * 8;
        const mat = bar.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.5 + Math.sin(t * 7 + i * 0.4) * 0.3;
      } else {
        // Idle gentle pulse
        const height = Math.sin(t * 1.5 + angle * 3) * 0.1 + 0.1;
        bar.scale.y = 1 + height;
        const mat = bar.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.1;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: barCount }).map((_, i) => {
        const angle = (i / barCount) * Math.PI * 2;
        const radius = 0.9;
        return (
          <mesh
            key={i}
            ref={(el) => { if (el) barsRef.current[i] = el; }}
            position={[
              Math.cos(angle) * radius,
              -0.5,
              Math.sin(angle) * radius,
            ]}
            rotation={[0, -angle + Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.008, 0.08, 0.002]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Component: Data Ring Text (floating HUD text) ────────────────
function DataRingText({
  isSpeaking,
}: {
  status: string;
  isSpeaking: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!groupRef.current) return;
    groupRef.current.rotation.y -= delta * (isSpeaking ? 0.8 : 0.15);
  });

  return <group ref={groupRef} />;
}

// ── Sync camera FOV to wrapper ───────────────────────────────────
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 0.3, 3.0);
      camera.fov = 40;
      camera.updateProjectionMatrix();
    }
  }, [camera]);
  return null;
}

// ── Main EvaViewer Component ─────────────────────────────────────
export default function EvaViewer({
  isSpeaking = false,
  status = 'SECURE',
  size = '100%',
  responseText = '',
}: EvaViewerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusColor = STATUS_COLORS[status] || '#00f0ff';

  // Ring configurations
  const rings = useMemo(() => [
    {
      radius: 1.3,
      rotationSpeed: 0.4,
      tilt: [Math.PI * 0.12, 0, Math.PI * 0.05] as [number, number, number],
      opacity: 0.35,
      thickness: 0.015,
    },
    {
      radius: 1.1,
      rotationSpeed: -0.6,
      tilt: [Math.PI * 0.3, Math.PI * 0.15, 0] as [number, number, number],
      opacity: 0.25,
      thickness: 0.012,
    },
    {
      radius: 0.95,
      rotationSpeed: 0.9,
      tilt: [Math.PI * 0.45, 0, Math.PI * 0.2] as [number, number, number],
      opacity: 0.2,
      thickness: 0.01,
    },
    {
      radius: 1.5,
      rotationSpeed: -0.2,
      tilt: [Math.PI * 0.08, Math.PI * 0.25, 0] as [number, number, number],
      opacity: 0.15,
      thickness: 0.008,
    },
  ], []);

  const ringColor = useMemo(() => new THREE.Color(statusColor), [statusColor]);

  // Speaking glow animation CSS
  const glowKeyframes = isSpeaking
    ? `0 0 40px 8px rgba(${status === 'ATTACK' ? '255,51,51' : status === 'WARNING' ? '245,158,11' : '0,240,255'},0.35),
       0 0 80px 20px rgba(${status === 'ATTACK' ? '255,51,51' : status === 'WARNING' ? '245,158,11' : '0,240,255'},0.12),
       0 0 120px 40px rgba(${status === 'ATTACK' ? '255,51,51' : status === 'WARNING' ? '245,158,11' : '0,240,255'},0.05)`
    : `0 0 20px 4px rgba(0,240,255,0.12)`;

  const statusLabel = status === 'ATTACK'
    ? 'THREAT DETECTED'
    : status === 'WARNING'
      ? 'ANOMALY SCAN'
      : 'SYSTEM NOMINAL';

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="img"
      aria-label="PULSAR EVA 3D Model"
    >
      {/* Ambient glow behind */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${status === 'ATTACK' ? 'rgba(255,51,51,0.1)' :
              status === 'WARNING' ? 'rgba(245,158,11,0.08)' :
                'rgba(0,240,255,0.08)'
            } 0%, transparent 70%)`,
          filter: 'blur(24px)',
          transition: 'all 0.6s ease',
          opacity: isHovered ? 1.4 : 0.9,
          animation: 'pulsar-ambient-pulse 3s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Outer ring glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          boxShadow: glowKeyframes,
          transition: 'box-shadow 0.5s ease',
          pointerEvents: 'none',
        }}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0.3, 3.0], fov: 40 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <CameraSetup />

        {/* Lighting */}
        <AdaptiveLights isSpeaking={isSpeaking} status={status} />

        {/* Environment for reflections */}
        <Environment preset="night" />

        <Suspense fallback={null}>
          {/* EVA 3D Model */}
          <EvaModel isSpeaking={isSpeaking} status={status} />

          {/* Energy Field around model */}
          <EnergyField isSpeaking={isSpeaking} status={status} />

          {/* Holographic Rings */}
          {rings.map((ring, i) => (
            <HoloRing
              key={i}
              radius={ring.radius}
              rotationSpeed={ring.rotationSpeed}
              tilt={ring.tilt}
              color={ringColor}
              opacity={ring.opacity * (isHovered ? 1.3 : 1)}
              isSpeaking={isSpeaking}
              thickness={ring.thickness}
            />
          ))}

          {/* Scan Rings */}
          <ScanRing isSpeaking={isSpeaking} status={status} radius={1.2} y={-0.5} />
          <ScanRing isSpeaking={isSpeaking} status={status} radius={1.0} y={0.5} />

          {/* Orbital Particles */}
          <OrbitalParticles count={100} isSpeaking={isSpeaking} status={status} />

          {/* Audio Visualizer Bars */}
          <AudioBars isSpeaking={isSpeaking} status={status} />

          {/* Data Ring Text */}
          <DataRingText status={status} isSpeaking={isSpeaking} />
        </Suspense>
      </Canvas>

      {/* Speaking pulse ring overlay */}
      {isSpeaking && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${statusColor}`,
            animation: 'eva-speak-ring 1s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Status indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: -10,
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
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            animation: status === 'ATTACK'
              ? 'pulsar-status-blink 0.5s infinite'
              : 'pulsar-status-blink 2s infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'Orbitron', 'Courier New', monospace",
            fontSize: 9,
            color: statusColor,
            letterSpacing: 3,
            opacity: 0.7,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Speaking label */}
      {isSpeaking && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'Courier New', monospace",
            fontSize: 9,
            color: statusColor,
            letterSpacing: 4,
            opacity: 0.7,
            animation: 'pulse-opacity 1s infinite',
            pointerEvents: 'none',
          }}
        >
          ◉ TRANSMITTING
        </div>
      )}

      {/* Holographic Text Output */}
      {isSpeaking && responseText && (
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            maxWidth: '600px',
            textAlign: 'center',
            padding: '24px 32px',
            background: 'linear-gradient(180deg, rgba(6,14,30,0.85) 0%, rgba(2,8,23,0.95) 100%)',
            border: `1px solid ${statusColor}`,
            borderRadius: '8px',
            boxShadow: `0 0 30px rgba(0, 240, 255, 0.25), inset 0 0 20px rgba(0, 240, 255, 0.1)`,
            fontFamily: "'Courier New', Courier, monospace",
            color: 'var(--pulsar-text)',
            fontSize: '15px',
            letterSpacing: '1px',
            lineHeight: '1.6',
            pointerEvents: 'none',
            zIndex: 10,
            backdropFilter: 'blur(12px)',
            animation: 'slide-up-fade 0.5s ease-out forwards',
          }}
        >
          {/* Decorative corners */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}` }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}` }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}` }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}` }} />

          {/* Header */}
          <div style={{ fontSize: '10px', color: statusColor, marginBottom: '8px', letterSpacing: '3px', fontWeight: 'bold' }}>
            P.U.L.S.A.R. AI RESPONSE
          </div>

          <div className="typewriter-effect glow-text">
            {responseText}
          </div>
        </div>
      )}

      <style>{`
        @keyframes eva-speak-ring {
          0%, 100% { transform: scale(1);   opacity: 0.4; }
          50%       { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes pulsar-status-blink {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes pulsar-ambient-pulse {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.03); }
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes slide-up-fade {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .typewriter-effect {
          overflow: hidden;
          white-space: pre-wrap;
          animation: typing 2s steps(40, end);
        }
        .glow-text {
          text-shadow: 0 0 10px rgba(0,212,255,0.5);
        }
        @keyframes typing {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Preload for faster first render
useGLTF.preload('/eva.glb');
