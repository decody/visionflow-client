import type {
  DeltaMessage,
  ServerMessage,
  SnapshotMessage,
  VehicleDelta,
  VehicleState,
} from '@/entities/oht/types';

/**
 * ws 전송 계층의 id 압축 코덱.
 *
 * OHT id는 `OHT-####` 형태라 매 델타 upd 항목의 `"id":"OHT-0001"`(15바이트)이
 * 대수에 비례해 큰 비중을 차지한다(5,000대 델타의 큰 부분). 와이어에서는 개체
 * 자신의 id를 정수 `i`로 바꿔 `"i":1`(≈6바이트)로 보내고, 수신 직후 원래
 * 문자열 id로 복원한다.
 *
 * - 압축은 ws 전송 경계에만 적용한다: ws-server가 인코딩, socket-client가 디코딩.
 * - 엔진·DeltaReducer·지도·UI와 Web Worker 경로(구조화 복제, 바이트 전송 아님)는
 *   도메인 문자열 id를 그대로 사용하므로 변경되지 않는다.
 * - 참조 필드(blockedBy, jobs, operations, alarms의 vehicleId 등)는 저빈도라
 *   문자열 그대로 둔다. 복원된 자신의 id와 동일한 `OHT-####` 형식이라 일관적이다.
 */
const PREFIX = 'OHT-';
const PAD = 4;

export const encodeVehicleId = (id: string): number =>
  Number(id.slice(PREFIX.length));

export const decodeVehicleId = (i: number): string =>
  PREFIX + String(i).padStart(PAD, '0');

export type WireVehicleState = Omit<VehicleState, 'id'> & { i: number };
export type WireVehicleDelta = Omit<VehicleDelta, 'id'> & { i: number };

export interface WireSnapshot
  extends Omit<SnapshotMessage, 'vehicles'> {
  vehicles: WireVehicleState[];
}
export interface WireDelta
  extends Omit<DeltaMessage, 'upd' | 'add' | 'del'> {
  upd: WireVehicleDelta[];
  add?: WireVehicleState[];
  del?: number[];
}
export type WireMessage = WireSnapshot | WireDelta;

const encState = (v: VehicleState): WireVehicleState => {
  const { id, ...rest } = v;
  return { ...rest, i: encodeVehicleId(id) };
};
const encDelta = (v: VehicleDelta): WireVehicleDelta => {
  const { id, ...rest } = v;
  return { ...rest, i: encodeVehicleId(id) };
};
const decState = (v: WireVehicleState): VehicleState => {
  const { i, ...rest } = v;
  return { ...rest, id: decodeVehicleId(i) };
};
const decDelta = (v: WireVehicleDelta): VehicleDelta => {
  const { i, ...rest } = v;
  return { ...rest, id: decodeVehicleId(i) };
};

export function encodeWireMessage(msg: ServerMessage): WireMessage {
  if (msg.type === 'snapshot') {
    return { ...msg, vehicles: msg.vehicles.map(encState) };
  }
  const { upd, add, del, ...rest } = msg;
  const wire: WireDelta = { ...rest, upd: upd.map(encDelta) };
  if (add) wire.add = add.map(encState);
  if (del) wire.del = del.map(encodeVehicleId);
  return wire;
}

export function decodeWireMessage(wire: WireMessage): ServerMessage {
  if (wire.type === 'snapshot') {
    return { ...wire, vehicles: wire.vehicles.map(decState) };
  }
  const { upd, add, del, ...rest } = wire;
  const msg: DeltaMessage = { ...rest, upd: upd.map(decDelta) };
  if (add) msg.add = add.map(decState);
  if (del) msg.del = del.map(decodeVehicleId);
  return msg;
}
