'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Shape } from 'three';
import type { Group } from 'three';

export function AtelierWorkbench() {
  const tape = useRef<Group>(null);
  const toilePanels = useMemo(() => {
    const left = new Shape();
    left.moveTo(0, -.66); left.lineTo(-.42, -.62); left.lineTo(-.55, .2); left.lineTo(-.48, .58); left.lineTo(-.2, .72); left.lineTo(0, .56); left.closePath();
    const right = new Shape();
    right.moveTo(0, -.66); right.lineTo(.42, -.62); right.lineTo(.55, .2); right.lineTo(.48, .58); right.lineTo(.2, .72); right.lineTo(0, .56); right.closePath();
    return [left, right];
  }, []);
  const patterns = useMemo(() => {
    const createShape = (points: Array<[number, number]>) => {
      const shape = new Shape();
      points.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
      shape.closePath();
      return shape;
    };
    return [
      { shape: createShape([[-.95,-.48],[-.18,-.52],[.02,-.2],[-.08,.48],[-.72,.55],[-1.02,.12]]), position: [-1.4, -1.59, 1.46] as [number, number, number], rotation: -.12 },
      { shape: createShape([[-.62,-.56],[.38,-.5],[.62,-.06],[.42,.56],[-.28,.5],[-.54,.12]]), position: [-.25, -1.585, 1.55] as [number, number, number], rotation: .08 },
      { shape: createShape([[-.52,-.42],[.52,-.36],[.42,.42],[-.34,.5],[-.62,.08]]), position: [.78, -1.58, 1.42] as [number, number, number], rotation: -.08 },
    ];
  }, []);
  useFrame(({ clock }, delta) => {
    if (tape.current) tape.current.rotation.z = Math.sin(clock.elapsedTime * .55) * .018;
  });
  return (
    <group>
      {/* A fitted toile on a traditional atelier dress form. */}
      <group position={[1.72, -.565, 1.02]}>
        <mesh position={[0, .85, 0]} scale={[.82, 1.18, .5]}>
          <sphereGeometry args={[.64, 32, 24]} />
          <meshBasicMaterial color="#b7aa98" />
        </mesh>
        <mesh position={[0, 1.68, 0]}><cylinderGeometry args={[.16, .19, .34, 24]} /><meshStandardMaterial color="#9f907d" roughness={.92} /></mesh>
        <mesh position={[0, -.48, 0]}><cylinderGeometry args={[.055, .055, 1.05, 16]} /><meshStandardMaterial color="#5f5549" metalness={.32} roughness={.48} /></mesh>
        <mesh position={[0, -1.03, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.045, .045, 1.12, 14]} /><meshStandardMaterial color="#5f5549" roughness={.55} /></mesh>
        {/* Toile panels and the dark basting lines that describe the cut. */}
        <group position={[-.15, 0, 0]}>
          {toilePanels.map((panel, index) => <mesh key={index} position={[0, .83, .34 + index * .002]}><shapeGeometry args={[panel, 12]} /><meshBasicMaterial color={index ? '#cbbfaf' : '#d9cfc1'} /></mesh>)}
          <mesh position={[0, .78, .36]}><boxGeometry args={[.016, 1.4, .009]} /><meshBasicMaterial color="#665e55" /></mesh>
          <mesh position={[0, .32, .365]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[.016, .88, .009]} /><meshBasicMaterial color="#766d62" /></mesh>
          {[-.38,-.19,0,.19,.38].map((x) => <mesh key={x} position={[x, .34 + Math.abs(x) * .28, .38]}><sphereGeometry args={[.019, 8, 8]} /><meshStandardMaterial color="#a88d54" metalness={.88} roughness={.25} /></mesh>)}
        </group>
      </group>

      {/* Solid workbench, scaled to read clearly without hiding the toile. */}
      <group>
        <mesh position={[0, -1.72, 1.62]}><boxGeometry args={[5.75, .16, 1.72]} /><meshStandardMaterial color="#9b8e7d" roughness={.82} /></mesh>
        {[-2.45,2.45].flatMap((x) => [-1,1].map((side) => <mesh key={`${x}-${side}`} position={[x, -2.28, 1.62 + side * .58]}><boxGeometry args={[.13, 1.08, .13]} /><meshStandardMaterial color="#756a5d" roughness={.84} /></mesh>))}
        <mesh position={[0, -2.28, 1.63]}><boxGeometry args={[5.08, .1, .1]} /><meshStandardMaterial color="#756a5d" roughness={.84} /></mesh>
      </group>

      {/* Individually cut paper pieces with seam allowance and notch marks. */}
      {patterns.map((pattern, index) => (
        <group key={index} position={pattern.position} rotation={[-Math.PI / 2, 0, pattern.rotation]}>
          <mesh><shapeGeometry args={[pattern.shape, 12]} /><meshStandardMaterial color={index === 1 ? '#dfd5c6' : '#eee6d9'} roughness={1} /></mesh>
          <mesh position={[0, 0, .009]}><shapeGeometry args={[pattern.shape, 12]} /><meshBasicMaterial color="#fff9ee" transparent opacity={.18} wireframe /></mesh>
          <mesh position={[0, -.05, .016]} rotation={[0, 0, index * .16 - .1]}><boxGeometry args={[index === 1 ? .9 : .7, .012, .008]} /><meshBasicMaterial color="#887e72" /></mesh>
          <mesh position={[index === 2 ? .24 : -.2, .2, .016]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[.38, .012, .008]} /><meshBasicMaterial color="#998e81" /></mesh>
        </group>
      ))}

      {/* Tailor's ruler, shears, thread and pin cushion. */}
      <mesh position={[-.25, -1.575, 1.12]} rotation={[0, .05, -.1]}><boxGeometry args={[1.55, .026, .12]} /><meshPhysicalMaterial color="#c5a86d" metalness={.25} opacity={.72} roughness={.36} transparent /></mesh>
      {Array.from({ length: 9 }, (_, index) => <mesh key={`ruler-${index}`} position={[-.85 + index * .16, -1.555, 1.075]}><boxGeometry args={[.008, .018, .055]} /><meshBasicMaterial color="#655844" /></mesh>)}
      <group position={[.42, -1.54, 1.92]} rotation={[0, -.2, -.08]}>
        <mesh position={[-.13, 0, 0]} rotation={[Math.PI / 2,0,0]}><torusGeometry args={[.12,.026,10,24]} /><meshStandardMaterial color="#665d55" metalness={.65} roughness={.3} /></mesh>
        <mesh position={[.13, 0, 0]} rotation={[Math.PI / 2,0,0]}><torusGeometry args={[.12,.026,10,24]} /><meshStandardMaterial color="#665d55" metalness={.65} roughness={.3} /></mesh>
        <mesh position={[-.21, 0, -.4]} rotation={[0,.12,0]}><boxGeometry args={[.055,.025,.65]} /><meshStandardMaterial color="#b7afa5" metalness={.8} roughness={.2} /></mesh>
        <mesh position={[.21, 0, -.4]} rotation={[0,-.12,0]}><boxGeometry args={[.055,.025,.65]} /><meshStandardMaterial color="#b7afa5" metalness={.8} roughness={.2} /></mesh>
      </group>
      <group position={[-2.25, -1.48, 1.7]}>
        <mesh scale={[1,.45,1]}><sphereGeometry args={[.18,18,12]} /><meshStandardMaterial color="#6f514a" roughness={.95} /></mesh>
        {[-.1,0,.1].map((x, index) => <mesh key={x} position={[x,.18,index % 2 ? .03 : -.02]} rotation={[0,0,(index-1)*.18]}><cylinderGeometry args={[.006,.006,.32,6]} /><meshStandardMaterial color="#d4c7a2" metalness={.7} /></mesh>)}
      </group>
      {[-1.9,-1.62].map((x, index) => <group key={x} position={[x,-1.49,2.02]}><mesh><cylinderGeometry args={[.1,.12,.26,20]} /><meshStandardMaterial color={index ? '#b9aa94' : '#6d6259'} roughness={.7} /></mesh><mesh position={[0,.17,0]}><cylinderGeometry args={[.035,.035,.12,12]} /><meshStandardMaterial color="#d9c8a9" /></mesh></group>)}
      <group ref={tape} position={[-.5, -1.54, 1.96]} rotation={[0,0,.04]}>
        <mesh><torusGeometry args={[.25,.025,10,40,Math.PI*1.55]} /><meshStandardMaterial color="#d2b66f" roughness={.65} /></mesh>
        <mesh position={[.38,0,.1]} rotation={[0,.38,0]}><boxGeometry args={[.7,.018,.055]} /><meshStandardMaterial color="#d2b66f" roughness={.65} /></mesh>
      </group>
    </group>
  );
}

export function ReverieMirrors() {
  return (
    <group>
      <mesh position={[-6.1, 0.25, 1.2]} rotation={[0, 0.48, 0]}><planeGeometry args={[2.2, 6]} /><meshPhysicalMaterial color="#bed4ef" metalness={0.92} opacity={0.28} roughness={0.08} transparent /></mesh>
      <mesh position={[6.1, 0.25, 1.2]} rotation={[0, -0.48, 0]}><planeGeometry args={[2.2, 6]} /><meshPhysicalMaterial color="#bed4ef" metalness={0.92} opacity={0.28} roughness={0.08} transparent /></mesh>
      {[-4,-2,0,2,4].map((x,index)=><pointLight key={x} color="#dce9ff" distance={7} intensity={5+index*1.2} position={[x,-1.4+index*.18,1.8]} />)}
    </group>
  );
}
