import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  INITIAL_VIEW_STATE,
  enterRegion,
  exitToGlobe,
  initialSession,
  lodForSession,
  lodForZoom,
  lodLabel,
  stepRotation,
} from './view-controller';

test('lodForZoom: 줌 임계값 경계', () => {
  assert.equal(lodForZoom(0), 'GLOBE');
  assert.equal(lodForZoom(1.99), 'GLOBE');
  assert.equal(lodForZoom(2), 'REGION');
  assert.equal(lodForZoom(4.49), 'REGION');
  assert.equal(lodForZoom(4.5), 'LOCAL');
  assert.equal(lodForZoom(9), 'LOCAL');
});

test('lodLabel: 모든 LOD에 라벨', () => {
  assert.equal(lodLabel('GLOBE'), '글로브 집계');
  assert.equal(lodLabel('REGION'), '권역 흐름');
  assert.equal(lodLabel('LOCAL'), '지역 상세');
});

test('stepRotation: 경도 전진 + ±180 wrap', () => {
  const s = stepRotation(INITIAL_VIEW_STATE, 10);
  assert.equal(s.longitude, 120);
  // 다른 필드는 보존
  assert.equal(s.latitude, INITIAL_VIEW_STATE.latitude);
  assert.equal(s.zoom, INITIAL_VIEW_STATE.zoom);

  const wrapped = stepRotation({ ...INITIAL_VIEW_STATE, longitude: 175 }, 10);
  assert.equal(wrapped.longitude, -175);
});

test('initialSession: 글로브 모드·권역 없음', () => {
  const s = initialSession();
  assert.equal(s.mode, 'GLOBE');
  assert.equal(s.region, null);
  assert.equal(s.view.zoom, INITIAL_VIEW_STATE.zoom);
});

test('enterRegion: 지역 모드 전환·중심/줌 반영', () => {
  const s = enterRegion('APAC', [115, 20], 3);
  assert.equal(s.mode, 'REGION');
  assert.equal(s.region, 'APAC');
  assert.equal(s.view.longitude, 115);
  assert.equal(s.view.latitude, 20);
  assert.equal(s.view.zoom, 3);
});

test('exitToGlobe: 글로브 초기 상태로 복귀', () => {
  const s = exitToGlobe();
  assert.equal(s.mode, 'GLOBE');
  assert.equal(s.region, null);
});

test('lodForSession: 모드별 LOD', () => {
  assert.equal(lodForSession({ mode: 'GLOBE', region: null, view: { ...INITIAL_VIEW_STATE, zoom: 0 } }), 'GLOBE');
  assert.equal(lodForSession({ mode: 'REGION', region: 'APAC', view: { ...INITIAL_VIEW_STATE, zoom: 3 } }), 'REGION');
  assert.equal(lodForSession({ mode: 'REGION', region: 'APAC', view: { ...INITIAL_VIEW_STATE, zoom: 5 } }), 'LOCAL');
});
