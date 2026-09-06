import type { ServerMessage } from '@/entities/oht/types';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

test(
  'ws transports dispatch, private snapshots, pause, pong and fleet reset to two clients',
  { timeout: 15000 },
  async (t) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'server/ws-server.ts'],
      {
        cwd: fileURLToPath(new URL('../../../', import.meta.url)),
        env: { ...process.env, WS_PORT: '0' },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    t.after(() => {
      child.kill();
    });
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(
        () =>
          reject(new Error('ws server startup timeout: ' + output)),
        5000,
      );
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
    const connect = () => {
      const socket = new WebSocket(url);
      const messages: (ServerMessage | { type: 'pong' })[] = [];
      socket.on('message', (raw) =>
        messages.push(JSON.parse(raw.toString())),
      );
      t.after(() => socket.terminate());
      return { socket, messages };
    };
    const a = connect();
    const wait = async (predicate: () => boolean) => {
      const end = Date.now() + 4000;
      while (!predicate()) {
        if (Date.now() > end) throw new Error('ws response timeout');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    };
    await wait(() => a.messages.some((m) => m.type === 'snapshot'));
    a.socket.send(
      JSON.stringify({ type: 'start', count: 8, rateHz: 10 }),
    );
    await wait(() => a.messages.some((m) => m.type === 'delta'));
    const b = connect();
    await wait(() => b.messages.some((m) => m.type === 'snapshot'));
    a.socket.send(JSON.stringify({ type: 'snapshot' }));
    a.socket.send(
      JSON.stringify({ type: 'setDispatch', rule: 'nearest' }),
    );
    await wait(() =>
      b.messages.some(
        (m) =>
          m.type === 'snapshot' && m.operations?.rule === 'nearest',
      ),
    );
    a.socket.send(
      JSON.stringify({ type: 'setPortIncident', enabled: true }),
    );
    await wait(() =>
      b.messages.some(
        (m) => m.type === 'snapshot' && m.operations?.incident?.active,
      ),
    );
    a.socket.send(
      JSON.stringify({ type: 'setPortIncident', enabled: false }),
    );
    await wait(() =>
      b.messages.some(
        (m) =>
          m.type === 'snapshot' && m.operations?.incident === undefined,
      ),
    );
    await wait(
      () => a.messages.filter((m) => m.type === 'delta').length >= 4,
    );
    const deltas = a.messages.filter((m) => m.type === 'delta');
    for (let i = 1; i < deltas.length; i++)
      assert.equal(deltas[i]!.seq, deltas[i - 1]!.seq + 1);
    a.socket.send(JSON.stringify({ type: 'stop' }));
    a.socket.send(JSON.stringify({ type: 'ping' }));
    await wait(() => a.messages.some((m) => m.type === 'pong'));
    const count = a.messages.filter((m) => m.type === 'delta').length;
    await new Promise((resolve) => setTimeout(resolve, 180));
    assert.equal(
      a.messages.filter((m) => m.type === 'delta').length,
      count,
    );
    b.socket.send(JSON.stringify({ type: 'setCount', count: 32 }));
    await wait(() =>
      a.messages.some(
        (m) => m.type === 'snapshot' && m.vehicles.length === 32,
      ),
    );
    b.socket.send(JSON.stringify({ type: 'start' }));
    await wait(
      () =>
        a.messages.filter((m) => m.type === 'delta').length > count,
    );
  },
);
