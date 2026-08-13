'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color } from 'three';
import type { Group, Mesh, ShaderMaterial } from 'three';

const fiberVertexShader = `
  varying float vFade;
  void main(){
    vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
    gl_Position=projectionMatrix*viewPosition;
    vFade=0.45+position.y*0.06;
  }
`;

const fiberFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main(){gl_FragColor=vec4(uColor,uOpacity*clamp(vFade,0.12,0.75));}
`;

export function AtelierVeil() {
  const group = useRef<Group>(null);
  const uniforms = useMemo(() => ({ uColor: { value: new Color('#fff3de') }, uOpacity: { value: 0.3 } }), []);
  const lines = useMemo(() => {
    const values = new Float32Array(120 * 6);
    for (let index = 0; index < 120; index += 1) {
      const x = ((index * 47) % 113) / 113 * 13 - 6.5;
      const y = ((index * 31) % 97) / 97 * 6 - 3;
      const z = ((index * 71) % 101) / 101 * 5 - 1.5;
      const offset = index * 6;
      values.set([x, y, z, x + 0.08, y + 0.7 + (index % 5) * 0.12, z + 0.03], offset);
    }
    return values;
  }, []);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.012; });
  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[lines, 3]} /></bufferGeometry>
        <shaderMaterial blending={AdditiveBlending} depthWrite={false} fragmentShader={fiberFragmentShader} transparent uniforms={uniforms} vertexShader={fiberVertexShader} />
      </lineSegments>
      <pointLight color="#fff5df" distance={12} intensity={7} position={[0, 2.8, 1.5]} />
    </group>
  );
}

export function RougeGlass() {
  const glass = useRef<Group>(null);
  useFrame((_, delta) => { if (glass.current) glass.current.rotation.y += delta * 0.018; });
  return (
    <group ref={glass}>
      {[-4.5, -1.5, 1.5, 4.5].map((x, index) => (
        <mesh key={x} position={[x, 0.3, 1.0 + (index % 2) * 0.45]} rotation={[0, (index - 1.5) * 0.09, 0]}>
          <planeGeometry args={[1.25, 5.6]} />
          <meshPhysicalMaterial color={index === 3 ? '#366181' : '#b30b3d'} metalness={0.18} opacity={0.2} roughness={0.08} side={2} thickness={0.6} transparent transmission={0.72} />
        </mesh>
      ))}
    </group>
  );
}

export function ReverieMirrors() {
  const center = useRef<Mesh>(null);
  const glow = useRef<ShaderMaterial>(null);
  useFrame(({ clock }) => {
    const pulse = 0.48 + Math.sin(clock.elapsedTime * 1.35) * 0.12;
    if (glow.current) glow.current.opacity = pulse;
    if (center.current) center.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.06;
  });
  return (
    <group>
      <mesh position={[-6.1, 0.25, 1.2]} rotation={[0, 0.48, 0]}><planeGeometry args={[2.2, 6]} /><meshPhysicalMaterial color="#bed4ef" metalness={0.92} opacity={0.28} roughness={0.08} transparent /></mesh>
      <mesh position={[6.1, 0.25, 1.2]} rotation={[0, -0.48, 0]}><planeGeometry args={[2.2, 6]} /><meshPhysicalMaterial color="#bed4ef" metalness={0.92} opacity={0.28} roughness={0.08} transparent /></mesh>
      <mesh ref={center} position={[0, -1.9, 1.4]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.3, 48]} /><meshBasicMaterial ref={glow} blending={AdditiveBlending} color="#cfe0ff" opacity={0.5} transparent /></mesh>
      {[-4,-2,0,2,4].map((x,index)=><pointLight key={x} color="#dce9ff" distance={7} intensity={5+index*1.2} position={[x,-1.4+index*.18,1.8]} />)}
    </group>
  );
}
