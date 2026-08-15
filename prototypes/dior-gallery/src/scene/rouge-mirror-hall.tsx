'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, MathUtils } from 'three';
import type { PointLight } from 'three';
import { Artwork } from './artwork';

interface RougeMirrorHallProps {
  images: readonly string[];
  mobile?: boolean;
  showHero: boolean;
  worldZ: number;
}

const seeded = (x: number, y: number, salt: number) => {
  const value = Math.sin(x * 91.17 + y * 47.31 + salt * 13.71) * 43758.5453;
  return value - Math.floor(value);
};

function createCrystalWall() {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];
  const palette = ['#8f092d', '#c21343', '#5b071f', '#e02658', '#410717', '#a72454'].map((color) => new Color(color));
  const columns = 20;
  const rows = 8;
  const cellWidth = .75;
  const cellHeight = 1.05;

  const addTriangle = (vertices: Array<[number, number, number]>, colorIndex: number) => {
    const color = palette[colorIndex % palette.length]!;
    vertices.forEach(([x, y, z]) => {
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
    });
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = -7.5 + column * cellWidth;
      const x1 = x0 + cellWidth;
      const y0 = -4.2 + row * cellHeight;
      const y1 = y0 + cellHeight;
      const insideNiche = x0 >= -1.5 && x1 <= 1.5 && y0 >= -2.1 && y1 <= 2.1;
      if (insideNiche) continue;
      const z00 = -1.34 + (seeded(column, row, 1) - .5) * .42;
      const z10 = -1.34 + (seeded(column, row, 2) - .5) * .42;
      const z01 = -1.34 + (seeded(column, row, 3) - .5) * .42;
      const z11 = -1.34 + (seeded(column, row, 4) - .5) * .42;
      const paletteIndex = Math.floor(seeded(column, row, 5) * palette.length);
      if ((column + row) % 2 === 0) {
        addTriangle([[x0, y0, z00], [x1, y0, z10], [x1, y1, z11]], paletteIndex);
        addTriangle([[x0, y0, z00], [x1, y1, z11], [x0, y1, z01]], paletteIndex + 1);
      } else {
        addTriangle([[x0, y0, z00], [x1, y0, z10], [x0, y1, z01]], paletteIndex);
        addTriangle([[x1, y0, z10], [x1, y1, z11], [x0, y1, z01]], paletteIndex + 2);
      }
    }
  }

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function RougeMirrorHall({ images, mobile = false, showHero, worldZ }: RougeMirrorHallProps) {
  const keyLight = useRef<PointLight>(null);
  const fillLight = useRef<PointLight>(null);
  const shimmerLightA = useRef<PointLight>(null);
  const shimmerLightB = useRef<PointLight>(null);
  const crystalGeometry = useMemo(createCrystalWall, []);

  useEffect(() => () => crystalGeometry.dispose(), [crystalGeometry]);

  useFrame(({ clock, pointer }, delta) => {
    if (keyLight.current) {
      keyLight.current.position.x = MathUtils.damp(keyLight.current.position.x, pointer.x * 4.4, 2.8, delta);
      keyLight.current.position.y = MathUtils.damp(keyLight.current.position.y, 1.2 + pointer.y * 1.6, 2.8, delta);
    }
    if (fillLight.current) {
      fillLight.current.position.x = MathUtils.damp(fillLight.current.position.x, -pointer.x * 3.2, 2.1, delta);
      fillLight.current.position.y = MathUtils.damp(fillLight.current.position.y, -.6 - pointer.y, 2.1, delta);
    }
    const time = clock.elapsedTime;
    if (shimmerLightA.current) {
      shimmerLightA.current.position.x = Math.sin(time * .48) * 6.2;
      shimmerLightA.current.position.y = 1.4 + Math.cos(time * .67) * 2.1;
    }
    if (shimmerLightB.current) {
      shimmerLightB.current.position.x = Math.cos(time * .37) * 5.4;
      shimmerLightB.current.position.y = -.4 + Math.sin(time * .58) * 2.4;
    }
  });

  return (
    <group>
      <mesh geometry={crystalGeometry}>
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={.025}
          emissive="#220008"
          emissiveIntensity={.2}
          iridescence={.22}
          metalness={.94}
          reflectivity={1}
          roughness={.065}
          specularIntensity={1}
          vertexColors
        />
      </mesh>

      {/* Angled return walls turn the facade into a faceted room. */}
      <mesh position={[-8.35, 0, .2]} rotation={[0, .48, 0]}>
        <planeGeometry args={[4.5, 8.4]} />
        <meshPhysicalMaterial color="#560719" metalness={.86} opacity={.82} roughness={.14} transparent />
      </mesh>
      <mesh position={[8.35, 0, .2]} rotation={[0, -.48, 0]}>
        <planeGeometry args={[4.5, 8.4]} />
        <meshPhysicalMaterial color="#720823" metalness={.86} opacity={.82} roughness={.14} transparent />
      </mesh>

      {/* Deep rectangular niche carved into the crystalline wall. */}
      <mesh position={[0, 0, -1.82]}>
        <planeGeometry args={[3, 4.2]} />
        <meshStandardMaterial color="#080104" metalness={.74} roughness={.16} />
      </mesh>
      <mesh position={[-1.7, 0, -1.48]} rotation={[0, -.34, 0]}>
        <boxGeometry args={[.55, 4.75, .72]} />
        <meshStandardMaterial color="#7c0a28" metalness={.82} roughness={.17} />
      </mesh>
      <mesh position={[1.7, 0, -1.48]} rotation={[0, .34, 0]}>
        <boxGeometry args={[.55, 4.75, .72]} />
        <meshStandardMaterial color="#a30c35" metalness={.82} roughness={.17} />
      </mesh>
      <mesh position={[0, 2.42, -1.48]} rotation={[-.34, 0, 0]}>
        <boxGeometry args={[3.55, .55, .72]} />
        <meshStandardMaterial color="#bb123e" metalness={.84} roughness={.16} />
      </mesh>
      <mesh position={[0, -2.42, -1.48]} rotation={[.34, 0, 0]}>
        <boxGeometry args={[3.55, .55, .72]} />
        <meshStandardMaterial color="#560719" metalness={.84} roughness={.16} />
      </mesh>

      {showHero ? (
        <Artwork
          alwaysVisible
          backplate={false}
          edgeFeather={.001}
          height={mobile ? 4.05 : 3.65}
          id="rouge-handbag-hero"
          interactive={false}
          position={[0, 0, -1.72]}
          renderOrder={10}
          url={images[0]!}
          width={mobile ? 2.9 : 2.62}
          worldZ={worldZ}
        />
      ) : null}

      {/* A polished crimson floor gives the wall a visible horizon and reflected glow. */}
      <mesh position={[0, -2.58, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 15]} />
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={.035}
          color="#190106"
          metalness={.92}
          reflectivity={1}
          roughness={.09}
        />
      </mesh>
      <mesh position={[0, -2.55, -.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 6.5]} />
        <meshBasicMaterial color="#a20a32" opacity={.12} transparent />
      </mesh>
      <mesh position={[0, -2.5, -1.02]}>
        <boxGeometry args={[14.8, .045, .12]} />
        <meshBasicMaterial color="#ff315f" opacity={.5} transparent />
      </mesh>

      <pointLight ref={keyLight} color="#ff174d" distance={8} intensity={3.2} position={[2.8, 1.4, 2.2]} />
      <pointLight ref={fillLight} color="#7b45ff" distance={7} intensity={1.6} position={[-2.4, -.8, 1.6]} />
      <pointLight ref={shimmerLightA} color="#ffd5df" distance={4.6} intensity={5.5} position={[-5, 2, .7]} />
      <pointLight ref={shimmerLightB} color="#ff2f68" distance={5.4} intensity={4.2} position={[5, -1, 1.1]} />
      <pointLight color="#ffbf55" distance={4.5} intensity={.8} position={[0, -2.25, .4]} />
    </group>
  );
}
