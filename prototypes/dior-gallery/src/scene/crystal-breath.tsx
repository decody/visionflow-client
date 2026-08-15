'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color } from 'three';
import type { ShaderMaterial } from 'three';

const random = (index: number, salt: number) => {
  const value = Math.sin(index * 73.71 + salt * 31.17) * 43758.5453;
  return value - Math.floor(value);
};

export function CrystalBreath() {
  const material = useRef<ShaderMaterial>(null);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 700;
  const count = mobile ? 680 : 1500;

  const particles = useMemo(() => {
    const scattered = new Float32Array(count * 3);
    const gathered = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const theta = random(index, 1) * Math.PI * 2;
      const phi = Math.acos(2 * random(index, 2) - 1);
      const radius = 3.8 + random(index, 3) * 5.6;
      scattered[offset] = Math.sin(phi) * Math.cos(theta) * radius;
      scattered[offset + 1] = Math.cos(phi) * radius * 0.62 + 0.35;
      scattered[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius * 0.55 + 1.2;

      // A couture-like bell silhouette: narrow shoulders, sculpted waist, wide hem.
      const height = random(index, 4) * 5.7 - 2.35;
      const normalizedY = (height + 2.35) / 5.7;
      const shoulder = 1.05 + Math.sin(normalizedY * Math.PI) * 0.42;
      const skirt = Math.max(0, 0.53 - normalizedY) * 4.3;
      const silhouetteRadius = shoulder + skirt;
      const ring = random(index, 5) * Math.PI * 2;
      const shell = 0.72 + random(index, 6) * 0.36;
      gathered[offset] = Math.cos(ring) * silhouetteRadius * shell;
      gathered[offset + 1] = height;
      gathered[offset + 2] = Math.sin(ring) * silhouetteRadius * 0.55 * shell + 1.15;
      seeds[index] = random(index, 7);
    }

    return { scattered, gathered, seeds };
  }, [count]);

  const uniforms = useMemo(() => ({
    uGoldLight: { value: new Color('#fff1b8') },
    uGoldDeep: { value: new Color('#d49a28') },
    uSilver: { value: new Color('#e7f0f5') },
    uPointScale: { value: mobile ? .7 : 1 },
    uAlphaScale: { value: mobile ? .68 : 1 },
    uTime: { value: 0 },
  }), [mobile]);

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.uniforms.uTime!.value = clock.elapsedTime;
    }
  });

  return (
    <points position={[0, 0.05, 1.15]} renderOrder={8}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.scattered, 3]} />
        <bufferAttribute attach="attributes-aGather" args={[particles.gathered, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[particles.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        transparent
        uniforms={uniforms}
        vertexShader={`
          attribute vec3 aGather;
          attribute float aSeed;
          uniform float uTime;
          uniform float uPointScale;
          varying float vSpark;
          varying float vGather;
          varying float vSeed;

          void main() {
            float breath = sin(uTime * 0.52 - 1.1);
            float gather = smoothstep(-0.55, 0.72, breath);
            gather = gather * gather * (3.0 - 2.0 * gather);
            vec3 compactGather = vec3(
              aGather.x * 0.475,
              (aGather.y - 0.45) * 0.5 + 0.4,
              (aGather.z - 1.15) * 0.4875 + 1.15
            );
            vec3 p = mix(position, compactGather, gather * 0.96);

            p.z += sin(uTime * 0.45 + aSeed * 18.0) * (0.08 + (1.0 - gather) * 0.18);

            vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            float twinkle = 0.68 + 0.32 * sin(uTime * 2.4 + aSeed * 42.0);
            gl_PointSize = clamp((5.5 + aSeed * 8.5) * (8.0 / -viewPosition.z) * (0.86 + gather * 0.78) * uPointScale, 1.8, 20.0 * uPointScale);
            vSpark = twinkle;
            vGather = gather;
            vSeed = aSeed;
          }
        `}
        fragmentShader={`
          uniform vec3 uGoldLight;
          uniform vec3 uGoldDeep;
          uniform vec3 uSilver;
          uniform float uAlphaScale;
          varying float vSpark;
          varying float vGather;
          varying float vSeed;

          void main() {
            vec2 p = gl_PointCoord - 0.5;
            float diamond = abs(p.x) + abs(p.y);
            if (diamond > 0.5) discard;
            float edge = 1.0 - smoothstep(0.31, 0.5, diamond);
            float facet = step(p.x, p.y) * 0.22 + step(-p.x, p.y) * 0.18;
            float core = 1.0 - smoothstep(0.0, 0.16, length(p));
            vec3 gold = mix(uGoldLight, uGoldDeep, clamp(gl_PointCoord.y + facet, 0.0, 1.0));
            float silverParticle = step(0.70, vSeed);
            vec3 silver = uSilver * (1.0 + facet * 0.75);
            vec3 color = mix(gold, silver, silverParticle);
            color *= 1.32 + core * 2.15 + vSpark * 0.68;
            float transparency = 0.26 + vGather * 0.18 + core * 0.2;
            gl_FragColor = vec4(color, edge * transparency * vSpark * uAlphaScale);
          }
        `}
      />
    </points>
  );
}
