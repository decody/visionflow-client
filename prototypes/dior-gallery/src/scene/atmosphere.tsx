'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, Vector2 } from 'three';
import type { Points, ShaderMaterial } from 'three';

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 91.17 + salt * 17.31) * 43758.5453;
  return value - Math.floor(value);
};

interface AtmosphereProps {
  count: number;
  color: string;
  position: [number, number, number];
  radius: [number, number, number];
  size: number;
  speed: number;
}

export function Atmosphere({ count, color, position, radius, size, speed }: AtmosphereProps) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const positions = useMemo(() => {
    const mobileScale = typeof window !== 'undefined' && window.innerWidth < 700 ? 0.58 : 1;
    const total = Math.max(24, Math.round(count * mobileScale));
    const values = new Float32Array(total * 3);
    for (let index = 0; index < total; index += 1) {
      const offset = index * 3;
      values[offset] = (seeded(index, 1) - 0.5) * radius[0];
      values[offset + 1] = (seeded(index, 2) - 0.5) * radius[1];
      values[offset + 2] = (seeded(index, 3) - 0.5) * radius[2];
    }
    return values;
  }, [count, radius]);
  const uniforms = useMemo(() => ({
    uColor: { value: new Color(color) },
    uSize: { value: size },
    uMouse: { value: new Vector2() },
    uTime: { value: 0 },
  }), [color, size]);

  useFrame(({ pointer }, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * speed;
    points.current.rotation.x += delta * speed * 0.12;
    if (material.current) {
      material.current.uniforms.uMouse!.value.lerp(pointer, 1 - Math.exp(-delta * 7));
      material.current.uniforms.uTime!.value += delta;
    }
  });

  return (
    <points ref={points} position={position}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <shaderMaterial
        ref={material}
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={`
          uniform vec3 uColor;
          void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
            if (distanceToCenter > 0.5) discard;
            float halo = 1.0 - smoothstep(0.02, 0.5, distanceToCenter);
            float core = 1.0 - smoothstep(0.0, 0.18, distanceToCenter);
            float alpha = halo * 0.58 + core * 0.42;
            vec3 glow = uColor * (1.15 + core * 1.9);
            gl_FragColor = vec4(glow, alpha);
          }
        `}
        transparent
        uniforms={uniforms}
        vertexShader={`
          uniform float uSize;
          uniform vec2 uMouse;
          uniform float uTime;
          void main() {
            vec3 animated = position;
            vec4 baseClip = projectionMatrix * modelViewMatrix * vec4(animated, 1.0);
            vec2 ndc = baseClip.xy / baseClip.w;
            vec2 away = ndc - uMouse;
            float proximity = 1.0 - smoothstep(0.0, 0.48, length(away));
            vec2 direction = normalize(away + vec2(0.0001));
            animated.xy += direction * proximity * 0.42;
            animated.z += sin(uTime * 1.8 + position.x * 2.1 + position.y) * proximity * 0.28;
            vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(uSize * (7.5 / -viewPosition.z) * (1.0 + proximity * 1.25), 2.0, uSize * 2.2);
          }
        `}
      />
    </points>
  );
}
