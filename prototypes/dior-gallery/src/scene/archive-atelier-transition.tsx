'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, MathUtils } from 'three';
import type { Mesh, MeshBasicMaterial, PointLight, ShaderMaterial } from 'three';
import { useGalleryStore } from '@/store/gallery-store';

export function ArchiveAtelierTransition() {
  const progress = useGalleryStore((state) => state.progress);
  const glow = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const backdrop = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const backdropColors = useMemo(() => ({ dark: new Color('#171513'), pale: new Color('#aaa39a') }), []);
  const uniforms = useMemo(() => ({
    uColor: { value: new Color('#fff1d7') },
    uOpacity: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    const phase = Math.min(1, Math.max(0, progress / 0.045));
    const intensity = Math.sin(phase * Math.PI);
    const bridgeIn = MathUtils.smoothstep(progress, .025, .065);
    const bridgeOut = 1 - MathUtils.smoothstep(progress, .09, .145);
    const bridgeOpacity = bridgeIn * bridgeOut;
    const brightness = MathUtils.smoothstep(progress, .025, .14);
    const glowFinished = phase >= 1;
    if (material.current) material.current.uniforms.uOpacity!.value = glowFinished
      ? 0
      : MathUtils.damp(material.current.uniforms.uOpacity!.value, intensity * 0.18, 7.5, delta);
    if (backdrop.current) {
      backdrop.current.opacity = progress >= .15
        ? 0
        : MathUtils.damp(backdrop.current.opacity, bridgeOpacity * .68, 9.5, delta);
      backdrop.current.color.copy(backdropColors.dark).lerp(backdropColors.pale, brightness);
    }
    if (light.current) light.current.intensity = glowFinished
      ? 0
      : MathUtils.damp(light.current.intensity, intensity * 2, 8.5, delta);
    if (glow.current) glow.current.scale.setScalar(0.7 + intensity * 0.42);
  });

  return (
    <group position={[0, 0.25, -13]}>
      <mesh position={[0, 0, -.08]} renderOrder={0}>
        <planeGeometry args={[26, 15]} />
        <meshBasicMaterial ref={backdrop} color="#171513" depthWrite={false} opacity={0} transparent />
      </mesh>
      <mesh ref={glow} renderOrder={1}>
        <planeGeometry args={[7.5, 7.5]} />
        <shaderMaterial
          ref={material}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
          uniforms={uniforms}
          vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`
            uniform vec3 uColor;
            uniform float uOpacity;
            varying vec2 vUv;
            void main(){
              float radius=distance(vUv,vec2(.5));
              float core=1.0-smoothstep(0.0,.2,radius);
              float halo=1.0-smoothstep(.04,.5,radius);
              gl_FragColor=vec4(uColor*(1.05+core*.85),(halo*.64+core*.36)*uOpacity);
            }
          `}
        />
      </mesh>
      <pointLight ref={light} color="#fff1d7" distance={18} intensity={0} position={[0, 0, 1.2]} />
    </group>
  );
}
