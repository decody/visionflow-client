import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  haversineKm,
  initialBearing,
  interpolate,
  midpoint,
  normalizeLon,
  samplePath,
  type LonLat,
} from './great-circle';

const SIN: LonLat = [103.8, 1.26]; // Singapore
const ICN: LonLat = [126.45, 37.46]; // Incheon
const LAX: LonLat = [-118.26, 33.73]; // Los Angeles

test('haversineKm: 알려진 거리에 근접(싱가포르-인천 ~4600km)', () => {
  const km = haversineKm(SIN, ICN);
  assert.ok(km > 4500 && km < 4750, `got ${km}`);
});

test('haversineKm: 같은 점은 0', () => {
  assert.equal(haversineKm(SIN, SIN), 0);
});

test('interpolate: 끝점은 입력과 일치', () => {
  const a = interpolate(SIN, ICN, 0);
  const b = interpolate(SIN, ICN, 1);
  assert.ok(Math.abs(a[0] - SIN[0]) < 1e-6 && Math.abs(a[1] - SIN[1]) < 1e-6);
  assert.ok(Math.abs(b[0] - ICN[0]) < 1e-6 && Math.abs(b[1] - ICN[1]) < 1e-6);
});

test('midpoint: 양 끝점까지 대권거리가 거의 같다', () => {
  const m = midpoint(SIN, ICN);
  const d1 = haversineKm(SIN, m);
  const d2 = haversineKm(m, ICN);
  assert.ok(Math.abs(d1 - d2) < 1, `d1=${d1} d2=${d2}`);
});

test('samplePath: segments+1개 점, 첫/끝이 입력', () => {
  const pts = samplePath(SIN, LAX, 24);
  assert.equal(pts.length, 25);
  const first = pts.at(0)!;
  const last = pts.at(-1)!;
  assert.ok(Math.abs(first[0] - SIN[0]) < 1e-6);
  assert.ok(Math.abs(last[0] - LAX[0]) < 1e-6);
});

test('normalizeLon: ±180 범위로 wrap', () => {
  assert.equal(normalizeLon(190), -170);
  assert.equal(normalizeLon(-190), 170);
  assert.equal(normalizeLon(45), 45);
});

test('initialBearing: 범위 0~360', () => {
  const b = initialBearing(SIN, ICN);
  assert.ok(b >= 0 && b < 360);
});
