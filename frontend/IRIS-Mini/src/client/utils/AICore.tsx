import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const BackgroundLogoScene = ({ isConnected }: { isConnected: boolean }) => {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      const pulse = Math.sin(t * 2) * 0.05 + 0.95;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[0, 0, -4]}>
      {/* Deep Dark Storm Atmosphere Glow */}
      <mesh ref={glowRef} position={[0, 0, -5]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color={isConnected ? "#030712" : "#020202"} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const LightningSparks = ({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions } = useMemo(() => {
    const pos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return { positions: pos };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * (isSpeaking ? 0.8 : isConnected ? 0.2 : 0.05);
    pointsRef.current.rotation.z += delta * (isSpeaking ? 0.4 : 0.1);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color={isConnected ? "#ffffff" : "#cccccc"} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
};

const AICore = ({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <Canvas style={{ width: "100%", height: "100%" }} camera={{ position: [0, 0, 8.5], fov: 50 }}>
        <ambientLight intensity={2.0} />
        <directionalLight position={[10, 10, 10]} intensity={4.5} />
        <pointLight position={[0, 0, 2]} intensity={3.0} color="#ffffff" />
        <BackgroundLogoScene isConnected={isConnected} />
        <LightningSparks isConnected={isConnected} isSpeaking={isSpeaking} />
      </Canvas>
    </div>
  );
};

export default AICore;
