import { create } from 'zustand';

import type { Alarm } from '@/entities/oht/types';
import type { StatusFilter } from '@/entities/oht/status';

export type { StatusFilter } from '@/entities/oht/status';

const ALARM_LIMIT = 40;

interface ControlState {
  selectedId: string | null;
  filter: StatusFilter;
  alarms: Alarm[];
  paused: boolean;
  setSelected: (id: string | null) => void;
  setFilter: (f: StatusFilter) => void;
  pushAlarms: (a: Alarm[]) => void;
  acknowledgeAlarm: (id: string) => void;
  recoverPortAlarms: (portId: string, ts: number) => void;
  clearAlarms: () => void;
  togglePaused: () => void;
}

export const useControlStore = create<ControlState>((set) => ({
  selectedId: null,
  filter: 'ALL',
  alarms: [],
  paused: false,
  setSelected: (id) => set({ selectedId: id }),
  setFilter: (filter) => set({ filter }),
  pushAlarms: (a) =>
    set((s) => {
      const incoming = a.map((alarm) => ({
        ...alarm,
        state: alarm.state ?? ('ACTIVE' as const),
      }));
      const ids = new Set(incoming.map((alarm) => alarm.id));
      return {
        alarms: [
          ...incoming,
          ...s.alarms.filter((alarm) => !ids.has(alarm.id)),
        ].slice(0, ALARM_LIMIT),
      };
    }),
  acknowledgeAlarm: (id) =>
    set((s) => ({
      alarms: s.alarms.map((alarm) =>
        alarm.id === id && (alarm.state ?? 'ACTIVE') === 'ACTIVE'
          ? {
              ...alarm,
              state: 'ACKNOWLEDGED',
              acknowledgedTs: Date.now(),
            }
          : alarm,
      ),
    })),
  recoverPortAlarms: (portId, ts) =>
    set((s) => ({
      alarms: s.alarms.map((alarm) =>
        alarm.message.includes(portId) &&
        (alarm.state ?? 'ACTIVE') !== 'RECOVERED'
          ? { ...alarm, state: 'RECOVERED', recoveredTs: ts }
          : alarm,
      ),
    })),
  clearAlarms: () => set({ alarms: [] }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
}));
