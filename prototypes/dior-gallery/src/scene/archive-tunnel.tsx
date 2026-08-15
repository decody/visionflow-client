'use client';

import { BackSide } from 'three';

const ringDepths = [3.6, 2.1, 0.6, -0.9, -2.4, -3.9, -5.4, -6.9];
const tunnelSurface = '#11100f';

export function ArchiveTunnel({ mobile = false }: { mobile?: boolean }) {
  const radius = mobile ? 3.75 : 5.4;
  const floorY = mobile ? -2.62 : -3.1;
  const wallHeight = mobile ? 3.3 : 3.9;
  return (
    <group>
      <mesh position={[0, 0.8, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, 12.2, 48, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.18} roughness={0.82} side={BackSide} />
      </mesh>

      <mesh position={[-radius, -1, -1.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12.2, wallHeight]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.14} roughness={0.86} />
      </mesh>
      <mesh position={[radius, -1, -1.7]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12.2, wallHeight]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.14} roughness={0.86} />
      </mesh>
      <mesh position={[0, floorY, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[radius * 2, 12.2]} />
        <meshStandardMaterial color={tunnelSurface} metalness={0.08} roughness={0.9} />
      </mesh>
      {ringDepths.map((z, index) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.8, 0]}>
            <torusGeometry args={[radius, 0.035, 8, 56, Math.PI]} />
            <meshBasicMaterial color={index % 2 === 0 ? '#b99b6d' : '#76664d'} transparent opacity={0.48} />
          </mesh>
          {[-radius, radius].map((x) => (
            <mesh key={x} position={[x, -1, 0]}>
              <planeGeometry args={[0.045, wallHeight]} />
              <meshBasicMaterial color={index % 2 === 0 ? '#b99b6d' : '#76664d'} transparent opacity={0.42} />
            </mesh>
          ))}
          <pointLight color="#d7b781" distance={7.5} intensity={index % 2 === 0 ? 2.8 : 1.7} position={[0, 3.9, 0.2]} />
        </group>
      ))}

      {[-radius * .44, 0, radius * .44].map((x) => (
        <mesh key={x} position={[x, floorY + .02, -1.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.025, 12]} />
          <meshBasicMaterial color="#b99b6d" transparent opacity={0.26} />
        </mesh>
      ))}
    </group>
  );
}
