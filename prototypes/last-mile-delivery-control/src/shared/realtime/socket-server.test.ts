import type { ServerMessage } from '@/shared/realtime/types';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

test(
  'ws: 두 클라이언트에 snapshot/delta·명령·역할 경계·pause·pong 전달',
  { timeout: 15000 },
  async (t) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'server/ws-server.ts'], {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      env: { ...process.env, WS_PORT: '0' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(() => child.kill());

    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('ws server startup timeout: ' + output)), 5000);
      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
        const match = output.match(/ws:\/\/localhost:\d+/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });
      child.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });
    });

    type Msg = ServerMessage | { type: 'pong' } | { type: 'error'; code: string; reason: string };
    const connect = () => {
      const socket = new WebSocket(url);
      const messages: Msg[] = [];
      socket.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
      t.after(() => socket.terminate());
      return { socket, messages };
    };
    const wait = async (predicate: () => boolean) => {
      const end = Date.now() + 4000;
      while (!predicate()) {
        if (Date.now() > end) throw new Error('ws response timeout');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    };
    const deltas = (m: Msg[]) => m.filter((x): x is Extract<ServerMessage, { type: 'delta' }> => x.type === 'delta');
    const snapshots = (m: Msg[]) => m.filter((x): x is Extract<ServerMessage, { type: 'snapshot' }> => x.type === 'snapshot');

    const a = connect();
    await wait(() => a.messages.some((m) => m.type === 'snapshot'));

    // 시작 → 델타 흐름
    a.socket.send(JSON.stringify({ type: 'start', count: 8, rateHz: 10 }));
    await wait(() => a.messages.some((m) => m.type === 'delta'));

    // 도메인 참조 경계: 존재하지 않는 rider는 엔진에 전달하지 않는다.
    a.socket.send(JSON.stringify({ type: 'reassign', riderId: 'R-NOT-FOUND' }));
    await wait(() => a.messages.some((m) => m.type === 'error' && m.code === 'BAD_REQUEST'));

    // 두 번째 클라이언트도 초기 스냅샷 수신
    const b = connect();
    await wait(() => b.messages.some((m) => m.type === 'snapshot'));

    // seq 단조 증가
    await wait(() => deltas(a.messages).length >= 4);
    const da = deltas(a.messages);
    for (let i = 1; i < da.length; i++) assert.equal(da[i]!.seq, da[i - 1]!.seq + 1);

    // 역할 경계: viewer로 낮추면 setRule이 거부되고 감사에 rejected로 남는다.
    a.socket.send(JSON.stringify({ type: 'setRole', role: 'viewer' }));
    a.socket.send(JSON.stringify({ type: 'setRule', rule: 'NEAREST' }));
    await wait(() =>
      snapshots(a.messages).some((m) => (m.audit ?? []).some((e) => e.action === 'setRule' && e.outcome === 'rejected')),
    );

    // supervisor로 올리면 승인되고 감사에 accepted로 남는다.
    a.socket.send(JSON.stringify({ type: 'setRole', role: 'supervisor' }));
    a.socket.send(JSON.stringify({ type: 'setRule', rule: 'NEAREST' }));
    await wait(() =>
      snapshots(a.messages).some((m) => (m.audit ?? []).some((e) => e.action === 'setRule' && e.outcome === 'accepted')),
    );

    // pause → 델타 정지
    a.socket.send(JSON.stringify({ type: 'stop' }));
    a.socket.send(JSON.stringify({ type: 'ping' }));
    await wait(() => a.messages.some((m) => m.type === 'pong'));
    const frozen = deltas(a.messages).length;
    await new Promise((resolve) => setTimeout(resolve, 180));
    assert.equal(deltas(a.messages).length, frozen);

    // setCount로 라이더 수 재구성(스냅샷 반영)
    b.socket.send(JSON.stringify({ type: 'setCount', count: 16 }));
    await wait(() => snapshots(a.messages).some((m) => m.riders.length === 16));

    // 재개 → 델타 재개
    b.socket.send(JSON.stringify({ type: 'start' }));
    await wait(() => deltas(a.messages).length > frozen);
  },
);

test(
  'ws: 인증 토큰이 설정되면 서버 actor를 사용하고 role 변경을 거부한다',
  { timeout: 15000 },
  async (t) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'server/ws-server.ts'], {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      env: { ...process.env, WS_PORT: '0', WS_AUTH_TOKENS: 'ops-token=OP-OPS:dispatcher' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(() => child.kill());
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('ws auth server startup timeout: ' + output)), 5000);
      child.on('error', (err) => { clearTimeout(timeout); reject(err); });
      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
        const match = output.match(/ws:\/\/localhost:\d+/);
        if (match) { clearTimeout(timeout); resolve(match[0]); }
      });
      child.stderr.on('data', (data: Buffer) => { output += data.toString(); });
    });

    const denied = new WebSocket(url);
    const deniedCode = await new Promise<number>((resolve) => denied.once('close', (code) => resolve(code)));
    assert.equal(deniedCode, 1008);

    const authorized = new WebSocket(`${url}?token=ops-token`);
    const messages: Array<ServerMessage | { type: 'error'; code: string; reason: string }> = [];
    authorized.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
    t.after(() => authorized.terminate());
    await new Promise<void>((resolve) => authorized.once('open', () => resolve()));
    const end = Date.now() + 4000;
    while (!messages.some((m) => m.type === 'snapshot')) {
      if (Date.now() > end) throw new Error('authorized snapshot timeout');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    authorized.send(JSON.stringify({ type: 'setRole', role: 'supervisor' }));
    while (!messages.some((m) => m.type === 'error' && m.code === 'FORBIDDEN')) {
      if (Date.now() > end + 4000) throw new Error('role guard timeout');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  },
);
