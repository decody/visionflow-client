import { buildRailGraph } from '@/entities/fab/rail-graph';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveJunctionMarkers,
  headingToShapeRotation,
} from './operational-markers';

test('junction markers expose directed merge and split points', () => {
  const markers = deriveJunctionMarkers(buildRailGraph());
  assert.ok(markers.length > 0);
  assert.ok(markers.some((marker) => marker.incoming > 1));
  assert.ok(markers.some((marker) => marker.outgoing > 1));
  assert.equal(new Set(markers.map((marker) => marker.id)).size, markers.length);
});

test('OHT heading converts east and north to map shape rotation', () => {
  assert.equal(headingToShapeRotation(0), Math.PI / 2);
  assert.ok(Math.abs(headingToShapeRotation(90)) < Number.EPSILON);
});
