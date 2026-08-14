'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, MathUtils, Plane, Raycaster, Vector3 } from 'three';
import type { Group, Mesh, PointLight, ShaderMaterial } from 'three';
import { useGalleryStore } from '@/store/gallery-store';

const raycaster = new Raycaster();
const plane = new Plane(new Vector3(0, 0, 1), 0);
const hit = new Vector3();
const previous = new Vector3();

function AuraDisc({ index }: { index: number }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uColor: { value: new Color(index === 0 ? '#fff0bd' : '#d7e8ff') },
    uStrength: { value: index === 0 ? 0.9 : 0.36 },
  }), [index]);
  return (
    <mesh position={[0, 0, -index * 0.025]} scale={1 + index * 0.5}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={material} blending={AdditiveBlending} depthWrite={false} fragmentShader={`
        uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
        void main(){float d=distance(vUv,vec2(.5)); if(d>.5) discard; float glow=pow(1.0-smoothstep(0.0,.5,d),2.2); gl_FragColor=vec4(uColor,glow*uStrength);}
      `} transparent uniforms={uniforms} vertexShader={`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`} />
    </mesh>
  );
}

export function CursorAura() {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const core = useRef<Mesh>(null);
  const camera = useThree((state) => state.camera);
  const pointer = useThree((state) => state.pointer);
  const chapter = useGalleryStore((state) => state.chapter);
  const velocity = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    raycaster.setFromCamera(pointer, camera);
    plane.constant = -(camera.position.z - 4.6);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    velocity.current = MathUtils.damp(velocity.current, hit.distanceTo(previous) / Math.max(delta, 0.001), 6, delta);
    previous.copy(hit);
    group.current.position.lerp(hit, 1 - Math.exp(-delta * 8));
    group.current.quaternion.copy(camera.quaternion);
    const pulse = 1 + Math.min(1.5, velocity.current * 0.045);
    const chapterScale = chapter === 'rouge' ? 0 : 1;
    group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, pulse * chapterScale, 5, delta));
    if (light.current) {
      const targetIntensity = chapter === 'rouge' ? 0 : 7 + Math.min(18, velocity.current * .7);
      light.current.intensity = MathUtils.damp(light.current.intensity, targetIntensity, 6, delta);
      light.current.color.set(chapter === 'rouge' ? '#ff174f' : chapter === 'reverie' ? '#b9d9ff' : '#ffe2a3');
    }
    if (core.current) core.current.rotation.z += delta * 0.35;
  });

  return (
    <group ref={group}>
      <AuraDisc index={0} /><AuraDisc index={1} /><AuraDisc index={2} />
      <mesh ref={core} scale={0.22}><ringGeometry args={[0.28, 0.5, 48]} /><meshBasicMaterial blending={AdditiveBlending} color="#ffffff" depthWrite={false} opacity={0.7} transparent /></mesh>
      <pointLight ref={light} color="#ffe2a3" distance={8} intensity={8} />
    </group>
  );
}
