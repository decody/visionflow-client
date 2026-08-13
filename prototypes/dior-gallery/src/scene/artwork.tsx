'use client';

import { useLoader } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { LinearFilter, MathUtils, SRGBColorSpace, TextureLoader } from 'three';
import type { Group, ShaderMaterial } from 'three';

interface ArtworkProps { url: string; position: [number, number, number]; rotation?: [number, number, number]; scale?: number; worldZ: number; archive?: boolean; }

export function Artwork({ url, position, rotation = [0, 0, 0], scale = 1, worldZ, archive = false }: ArtworkProps) {
  const group = useRef<Group>(null);
  const imageMaterial = useRef<ShaderMaterial>(null);
  const reveal = useRef(0);
  const sourceTexture = useLoader(TextureLoader, url);
  const texture = useMemo(() => {
    const copy = sourceTexture.clone();
    copy.colorSpace = SRGBColorSpace;
    copy.minFilter = LinearFilter;
    copy.needsUpdate = true;
    return copy;
  }, [sourceTexture]);
  const uniforms = useMemo(() => ({
    uMap: { value: texture },
    uReveal: { value: 0 },
    uArchive: { value: archive ? 1 : 0 },
  }), [archive, texture]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ camera }, delta) => {
    const distance = Math.abs(camera.position.z - (worldZ + position[2]));
    const target = distance < 12 ? 1 : 0.08;
    reveal.current = MathUtils.damp(reveal.current, target, 4.5, delta);
    if (imageMaterial.current) imageMaterial.current.uniforms.uReveal!.value = reveal.current;
    if (group.current) group.current.scale.setScalar(scale * (0.92 + reveal.current * 0.08));
  });
  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, -0.04]}><planeGeometry args={[3.34, 2.54]} /><meshStandardMaterial color="#090909" /></mesh>
      <mesh>
        <planeGeometry args={[3.12, 2.32]} />
        <shaderMaterial
          ref={imageMaterial}
          depthWrite={false}
          fragmentShader={`
            uniform sampler2D uMap;
            uniform float uReveal;
            uniform float uArchive;
            varying vec2 vUv;
            void main() {
              vec4 image = texture2D(uMap, vUv);
              float mono = dot(image.rgb, vec3(0.299, 0.587, 0.114));
              vec3 memory = vec3(mono) * vec3(0.92, 0.86, 0.76);
              float colorMix = mix(1.0, smoothstep(0.18, 0.92, uReveal), uArchive);
              vec3 developed = mix(memory, image.rgb, colorMix);
              float edge = smoothstep(0.0, 0.09, vUv.x) * smoothstep(0.0, 0.09, vUv.y)
                * smoothstep(0.0, 0.09, 1.0-vUv.x) * smoothstep(0.0, 0.09, 1.0-vUv.y);
              gl_FragColor = vec4(developed, image.a * uReveal * edge);
            }
          `}
          transparent
          uniforms={uniforms}
          vertexShader={`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        />
      </mesh>
    </group>
  );
}
