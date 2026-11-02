import { once } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';

const PORT = 3017;
const root = process.cwd();
let server: ChildProcess | null = null;

function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket 응답 시간 초과')), 5_000);
    socket.once('message', (raw) => {
      clearTimeout(timer);
      resolve(JSON.parse(raw.toString()) as Record<string, unknown>);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function connect(): Promise<WebSocket> {
  const socket = new WebSocket(`ws://localhost:${PORT}`);
  await once(socket, 'open');
  return socket;
}

before(async () => {
  server = spawn(process.execPath, ['--import', 'tsx', 'server/ws-server.ts'], {
    cwd: root,
    env: { ...process.env, WS_PORT: String(PORT), WS_STATE_SCOPE: 'isolated' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket 서버 기동 시간 초과')), 10_000);
    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes(`:${PORT}`)) {
        clearTimeout(timer);
        resolve();
      }
    };
    server?.stdout?.on('data', onData);
    server?.stderr?.on('data', onData);
    server?.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`WebSocket 서버가 조기 종료됨: ${code}`));
    });
  });
});

after(() => {
  server?.kill();
  server = null;
});

test('WebSocket snapshot·권한 거부·승인·잘못된 요청을 검증한다', async () => {
  const socket = await connect();
  try {
    const initial = await nextMessage(socket);
    assert.equal(initial.type, 'snapshot');

    socket.send(JSON.stringify({ type: 'setRole', role: 'viewer' }));
    socket.send(JSON.stringify({ type: 'inject', scenario: 'canalClosure', on: true }));
    const forbidden = await nextMessage(socket);
    assert.equal(forbidden.type, 'snapshot');
    const forbiddenAudit = (forbidden.audit as Array<Record<string, unknown>>).at(-1);
    assert.equal(forbiddenAudit?.code, 'FORBIDDEN');

    socket.send(JSON.stringify({ type: 'setRole', role: 'supervisor' }));
    socket.send(JSON.stringify({ type: 'inject', scenario: 'canalClosure', on: true }));
    const accepted = await nextMessage(socket);
    assert.equal(accepted.type, 'snapshot');
    assert.ok((accepted.meta as { scenarios: string[] }).scenarios.includes('canalClosure'));

    socket.send('{malformed');
    const badRequest = await nextMessage(socket);
    assert.equal(badRequest.type, 'error');
    assert.equal(badRequest.code, 'BAD_REQUEST');
  } finally {
    socket.close();
  }
});
