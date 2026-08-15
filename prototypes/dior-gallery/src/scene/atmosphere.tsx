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
  accentColor?: string;
  secondaryColor?: string;
  position: [number, number, number];
  radius: [number, number, number];
  size: number;
  speed: number;
}

export function Atmosphere({ count, color, accentColor = '#fff1cf', secondaryColor = '#b7d7ff', position, radius, size, speed }: AtmosphereProps) {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 700;
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const positions = useMemo(() => {
    const mobileScale = mobile ? 0.58 : 1;
    const total = Math.max(24, Math.round(count * mobileScale));
    const values = new Float32Array(total * 3);
    for (let index = 0; index < total; index += 1) {
      const offset = index * 3;
      values[offset] = (seeded(index, 1) - 0.5) * radius[0];
      values[offset + 1] = (seeded(index, 2) - 0.5) * radius[1];
      values[offset + 2] = (seeded(index, 3) - 0.5) * radius[2];
    }
    return values;
  }, [count, mobile, radius]);
  const uniforms = useMemo(() => ({
    uColor: { value: new Color(color) },
    uAccentColor: { value: new Color(accentColor) },
    uSecondaryColor: { value: new Color(secondaryColor) },
    uSize: { value: size * (mobile ? .64 : 1) },
    uMouse: { value: new Vector2() },
    uTime: { value: 0 },
  }), [accentColor, color, mobile, secondaryColor, size]);

  useFrame(({ clock, pointer }, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * speed * 1.35;
    points.current.rotation.x = Math.cos(clock.elapsedTime * .12 + position[2] * .1) * .045;
    points.current.rotation.z = Math.sin(clock.elapsedTime * .1 + position[2] * .08) * .06;
    points.current.position.y = position[1] + Math.sin(clock.elapsedTime * .17 + position[2]) * .18;
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
          uniform vec3 uAccentColor;
          uniform vec3 uSecondaryColor;
          varying float vChromatic;
          varying float vPulse;
          void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
            if (distanceToCenter > 0.5) discard;
            float halo = 1.0 - smoothstep(0.02, 0.5, distanceToCenter);
            float core = 1.0 - smoothstep(0.0, 0.18, distanceToCenter);
            float alpha = (halo * 0.54 + core * 0.46) * (0.68 + vPulse * 0.38);
            vec3 firstBlend = mix(uColor, uAccentColor, smoothstep(0.0, 0.55, vChromatic));
            vec3 palette = mix(firstBlend, uSecondaryColor, smoothstep(0.48, 1.0, vChromatic));
            vec3 glow = palette * (1.14 + core * 2.05 + vPulse * .34);
            gl_FragColor = vec4(glow, alpha);
          }
        `}
        transparent
        uniforms={uniforms}
        vertexShader={`
          uniform float uSize;
          uniform vec2 uMouse;
          uniform float uTime;
          varying float vChromatic;
          varying float vPulse;

          float hash31(vec3 value) {
            return fract(sin(dot(value, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          }

          void main() {
            float seed = hash31(position);
            float phase = dot(position, vec3(.73, 1.17, .41)) + seed * 6.28318;
            float driftSpeed = .22 + seed * .48;
            float driftRadius = .22 + seed * .5;
            vec3 animated = position;
            animated.x += sin(uTime * driftSpeed + phase) * driftRadius
              + cos(uTime * (.16 + seed * .19) + position.z) * .2;
            animated.y += cos(uTime * (driftSpeed * .82) + phase * 1.37) * (driftRadius * .72)
              + sin(uTime * .2 + position.x) * .17;
            animated.z += sin(uTime * (driftSpeed * .7) + phase * .77) * (driftRadius * 1.35);
            vec4 baseClip = projectionMatrix * modelViewMatrix * vec4(animated, 1.0);
            vec2 ndc = baseClip.xy / baseClip.w;
            vec2 away = ndc - uMouse;
            float proximity = 1.0 - smoothstep(0.0, 0.48, length(away));
            vec2 direction = normalize(away + vec2(0.0001));
            animated.xy += direction * proximity * 0.58;
            animated.z += sin(uTime * 2.1 + position.x * 2.1 + position.y) * proximity * 0.4;
            vChromatic = fract(seed * .78 + uTime * (.018 + seed * .018) + sin(phase + uTime * .11) * .08);
            vPulse = .5 + .5 * sin(uTime * (.55 + seed * .75) + phase);
            vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(uSize * (7.5 / -viewPosition.z) * (.98 + vPulse * .5 + proximity * 1.3), 2.5, uSize * 2.55);
          }
        `}
      />
    </points>
  );
}
