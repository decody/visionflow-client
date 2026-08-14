'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { LinearFilter, SRGBColorSpace, TextureLoader } from 'three';
import type { Mesh, ShaderMaterial } from 'three';

export function ReverieBackdrop({ url }: { url: string }) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const source = useLoader(TextureLoader, url);
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = SRGBColorSpace;
    copy.minFilter = LinearFilter;
    copy.needsUpdate = true;
    return copy;
  }, [source]);
  const uniforms = useMemo(() => ({
    uMap: { value: texture },
    uMouse: { value: [0, 0] },
  }), [texture]);

  useFrame(({ pointer }, delta) => {
    if (!mesh.current || !material.current) return;
    mesh.current.position.x += (pointer.x * -0.3 - mesh.current.position.x) * Math.min(1, delta * 1.8);
    mesh.current.position.y += (pointer.y * -0.14 + 0.25 - mesh.current.position.y) * Math.min(1, delta * 1.8);
    material.current.uniforms.uMouse!.value = [pointer.x, pointer.y];
  });

  return (
    <mesh ref={mesh} position={[0, 0.25, -2.38]} scale={[1.08, 1.08, 1]}>
      <planeGeometry args={[17.4, 9.4]} />
      <shaderMaterial
        ref={material}
        depthWrite={false}
        transparent
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`
          uniform sampler2D uMap;
          varying vec2 vUv;
          void main() {
            vec2 texel = vec2(0.010, 0.018);
            vec3 color = texture2D(uMap, vUv).rgb * 0.18;
            color += texture2D(uMap, vUv + vec2(texel.x, 0.0)).rgb * 0.12;
            color += texture2D(uMap, vUv - vec2(texel.x, 0.0)).rgb * 0.12;
            color += texture2D(uMap, vUv + vec2(0.0, texel.y)).rgb * 0.12;
            color += texture2D(uMap, vUv - vec2(0.0, texel.y)).rgb * 0.12;
            color += texture2D(uMap, vUv + texel).rgb * 0.085;
            color += texture2D(uMap, vUv - texel).rgb * 0.085;
            color += texture2D(uMap, vUv + vec2(texel.x, -texel.y)).rgb * 0.085;
            color += texture2D(uMap, vUv + vec2(-texel.x, texel.y)).rgb * 0.085;
            float vignette = smoothstep(0.88, 0.22, distance(vUv, vec2(0.5)));
            color *= mix(0.12, 0.68, vignette);
            color = mix(vec3(dot(color, vec3(0.299,0.587,0.114))), color, 0.36);
            color = mix(vec3(0.027, 0.031, 0.031), color, smoothstep(0.02, 0.48, vignette));
            gl_FragColor = vec4(color, 0.56);
          }
        `}
      />
    </mesh>
  );
}
