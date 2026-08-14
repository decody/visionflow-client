'use client';

import { BackSide } from 'three';

const ringDepths = [3.6, 2.1, 0.6, -0.9, -2.4, -3.9, -5.4, -6.9];
const tunnelSurface = '#11100f';

export function ArchiveTunnel() {
  return (
    <group>
      <mesh position={[0, 0.8, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.4, 5.4, 12.2, 48, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.18} roughness={0.82} side={BackSide} />
      </mesh>

      <mesh position={[-5.4, -1.15, -1.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12.2, 3.9]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.14} roughness={0.86} />
      </mesh>
      <mesh position={[5.4, -1.15, -1.7]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12.2, 3.9]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.14} roughness={0.86} />
      </mesh>
      <mesh position={[0, -3.1, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.8, 12.2]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.08} roughness={0.9} />
      </mesh>
      {ringDepths.map((z, index) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.8, 0]}>
            <torusGeometry args={[5.4, 0.035, 8, 56, Math.PI]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#b99b6d' : '#76664d'} transparent opacity={0.48} />
          </mesh>
          {[-5.4, 5.4].map((x) => (
            <mesh key={x} position={[x, -1.15, 0]}>
              <planeGeometry args={[0.045, 3.9]} />
              <meshBasicMaterial color={index % 2 === 0 ? '#b99b6d' : '#76664d'} transparent opacity={0.42} />
            </mesh>
          ))}
          <pointLight color="#d7b781" distance={7.5} intensity={index % 2 === 0 ? 2.8 : 1.7} position={[0, 3.9, 0.2]} />
        </group>
      ))}

      {[-2.35, 0, 2.35].map((x) => (
        <mesh key={x} position={[x, -3.08, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.025, 12]} />
          <meshBasicMaterial color="#b99b6d" transparent opacity={0.26} />
        </mesh>
      ))}
    </group>
  );
}
