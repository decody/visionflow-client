import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSmat2022Rail } from './smat2022-rail';

const SAMPLE = [
  'RAILDATA',
  'SCALE\t0.0\t300327.9528\t-5580.357143\t147247.0238',
  'NODE\t1\t100.0\t200.0',
  'NODE\t2\t100.0\t400.0',
  'NODE\t3\t500.0\t400.0',
  'LINK\t1\tLINE\t1\t2',
  'RAILLIST\t1\tLINE\t1\t2\t100.0\t200.0\t100.0\t400.0\t90.0\t200.0',
  'RAILLIST\t1\tCURVE\t2\t3\t100.0\t400.0\t500.0\t400.0\t0.0\t400.0',
  'EQTONODEMAP\tPHOTO_1\t3',
  'TEXT\tPHOTO_1\tEQ\t480.0\t420.0',
].join('\n');

test('parseSmat2022Rail: 노드·링크·툴그룹·extent 파싱', () => {
  const g = parseSmat2022Rail(SAMPLE);
  assert.deepEqual(g.extent, [0, -5580.357143, 300327.9528, 147247.0238]);
  assert.equal(g.stats.nodes, 3);
  assert.equal(g.stats.links, 2);
  assert.equal(g.stats.curves, 1);
  assert.equal(g.stats.sections, 1);
  assert.equal(g.stats.toolGroups, 1);
});

test('parseSmat2022Rail: LINE/CURVE 구분과 끝점 좌표', () => {
  const g = parseSmat2022Rail(SAMPLE);
  const [line, curve] = g.links;
  assert.equal(line!.curve, false);
  assert.deepEqual(line!.a, [100, 200]);
  assert.deepEqual(line!.b, [100, 400]);
  assert.equal(line!.length, 200);
  assert.equal(curve!.curve, true);
  assert.equal(curve!.from, 2);
  assert.equal(curve!.to, 3);
});

test('parseSmat2022Rail: 툴그룹은 EQTONODEMAP+TEXT 결합, 끝점 노드는 실재', () => {
  const g = parseSmat2022Rail(SAMPLE);
  const tg = g.toolGroups[0]!;
  assert.equal(tg.name, 'PHOTO_1');
  assert.equal(tg.node, 3);
  assert.deepEqual(tg.at, [480, 420]); // TEXT 좌표 우선
  // 모든 링크 끝점 노드가 nodes에 존재
  for (const l of g.links) {
    assert.ok(g.nodes[l.from], `node ${l.from}`);
    assert.ok(g.nodes[l.to], `node ${l.to}`);
  }
});
