'use client';

import { useLoader } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { useState } from 'react';
import { LinearFilter, MathUtils, SRGBColorSpace, TextureLoader } from 'three';
import type { Group, ShaderMaterial } from 'three';
import { useGalleryStore } from '@/store/gallery-store';

interface ArtworkProps { id: string; url: string; position: [number, number, number]; rotation?: [number, number, number]; scale?: number; width?: number; height?: number; worldZ: number; archive?: boolean; backplate?: boolean; brightness?: number; depthTest?: boolean; edgeFeather?: number; pointerTiltY?: boolean; interactive?: boolean; framed?: boolean; frameColor?: string; frameThickness?: number; alwaysVisible?: boolean; mirrorX?: boolean; opacity?: number; renderOrder?: number; }

export function Artwork({ id, url, position, rotation = [0, 0, 0], scale = 1, width = 3.12, height = 2.32, worldZ, archive = false, backplate = true, brightness = 1, depthTest = true, edgeFeather = 0.09, pointerTiltY = false, interactive = true, framed = false, frameColor = '#9d7c4d', frameThickness = .065, alwaysVisible = false, mirrorX = false, opacity = 1, renderOrder = 0 }: ArtworkProps) {
  const [hovered, setHovered] = useState(false);
  const setFocusedArtworkId = useGalleryStore((state) => state.setFocusedArtworkId);
  const group = useRef<Group>(null);
  const imageMaterial = useRef<ShaderMaterial>(null);
  const reveal = useRef(alwaysVisible ? 1 : 0);
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
    uReveal: { value: alwaysVisible ? 1 : 0 },
    uArchive: { value: archive ? 1 : 0 },
    uBrightness: { value: brightness },
    uEdgeFeather: { value: edgeFeather },
    uMirrorX: { value: mirrorX ? 1 : 0 },
    uOpacity: { value: opacity },
  }), [alwaysVisible, archive, brightness, edgeFeather, mirrorX, opacity, texture]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ camera, pointer }, delta) => {
    const distance = Math.abs(camera.position.z - (worldZ + position[2]));
    const target = alwaysVisible || distance < 12 ? 1 : 0.08;
    reveal.current = MathUtils.damp(reveal.current, target, 4.5, delta);
    if (imageMaterial.current) imageMaterial.current.uniforms.uReveal!.value = reveal.current;
    if (group.current) {
      const hoverScale = interactive && hovered ? 1.075 : 1;
      group.current.scale.setScalar(scale * (0.92 + reveal.current * 0.08) * hoverScale);
      const targetZ = interactive && hovered ? rotation[2] + 0.025 : rotation[2];
      group.current.rotation.z = MathUtils.damp(group.current.rotation.z, targetZ, 5, delta);
      if (pointerTiltY) {
        group.current.rotation.x = MathUtils.damp(group.current.rotation.x, rotation[0], 5, delta);
        group.current.rotation.y = MathUtils.damp(group.current.rotation.y, rotation[1] + pointer.x * Math.PI * 2 / 9, 5, delta);
        group.current.position.x = MathUtils.damp(group.current.position.x, position[0], 5, delta);
      }
    }
  });
  return (
    <group ref={group} position={position} rotation={rotation} scale={scale} onClick={interactive ? (event) => { event.stopPropagation(); setFocusedArtworkId(id); } : undefined} onPointerOut={interactive ? () => setHovered(false) : undefined} onPointerOver={interactive ? (event) => { event.stopPropagation(); setHovered(true); } : undefined}>
      {backplate ? <mesh position={[0, 0, -0.04]}><planeGeometry args={[width + 0.22, height + 0.22]} /><meshStandardMaterial color="#090909" /></mesh> : null}
      {framed ? (
        <group position={[0, 0, 0.04]}>
          {[-1, 1].map((direction) => (
            <mesh key={`horizontal-${direction}`} position={[0, direction * (height / 2 + frameThickness / 2), 0]}>
              <boxGeometry args={[width + frameThickness * 2, frameThickness, 0.12]} />
              <meshStandardMaterial color={frameColor} metalness={0.04} roughness={0.74} />
            </mesh>
          ))}
          {[-1, 1].map((direction) => (
            <mesh key={`vertical-${direction}`} position={[direction * (width / 2 + frameThickness / 2), 0, 0]}>
              <boxGeometry args={[frameThickness, height, 0.12]} />
              <meshStandardMaterial color={frameColor} metalness={0.04} roughness={0.74} />
            </mesh>
          ))}
        </group>
      ) : null}
      <mesh renderOrder={renderOrder}>
        <planeGeometry args={[width, height]} />
        <shaderMaterial
          ref={imageMaterial}
          depthTest={depthTest}
          depthWrite={false}
          fragmentShader={`
            uniform sampler2D uMap;
            uniform float uReveal;
            uniform float uArchive;
            uniform float uBrightness;
            uniform float uEdgeFeather;
            uniform float uMirrorX;
            uniform float uOpacity;
            varying vec2 vUv;
            void main() {
              vec2 imageUv = vec2(mix(vUv.x, 1.0-vUv.x, uMirrorX), vUv.y);
              vec4 image = texture2D(uMap, imageUv);
              float mono = dot(image.rgb, vec3(0.299, 0.587, 0.114));
              vec3 memory = vec3(mono) * vec3(0.92, 0.86, 0.76);
              float colorMix = mix(1.0, smoothstep(0.18, 0.92, uReveal), uArchive);
              vec3 developed = mix(memory, image.rgb, colorMix);
              float edge = smoothstep(0.0, uEdgeFeather, vUv.x) * smoothstep(0.0, uEdgeFeather, vUv.y)
                * smoothstep(0.0, uEdgeFeather, 1.0-vUv.x) * smoothstep(0.0, uEdgeFeather, 1.0-vUv.y);
              gl_FragColor = vec4(developed * uBrightness, image.a * uReveal * edge * uOpacity);
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
