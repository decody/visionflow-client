import axios from 'axios';
import { create } from 'zustand';

export { theme } from './constants/theme';
export type { Theme } from './constants/theme';

export type VisionMetric = {
  id: string;
  label: string;
  value: number;
  delta: number;
};

export type PipelineRun = {
  id: string;
  model: string;
  owner: string;
  status: 'completed' | 'queued' | 'running' | 'failed';
  accuracy: number;
  latencyMs: number;
};

export const createApiClient = (baseURL: string) =>
  axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15_000,
  });

export const dashboardMetrics: VisionMetric[] = [
  { id: 'frames', label: 'Processed Frames', value: 128_400, delta: 12.8 },
  { id: 'accuracy', label: 'Model Accuracy', value: 98.2, delta: 1.6 },
  { id: 'alerts', label: 'Active Alerts', value: 14, delta: -8.4 },
];

export const pipelineRuns: PipelineRun[] = [
  {
    id: 'VF-1028',
    accuracy: 98.2,
    latencyMs: 43,
    model: 'Defect Detector v4',
    owner: 'Inspection Team',
    status: 'running',
  },
  {
    id: 'VF-1027',
    accuracy: 96.7,
    latencyMs: 58,
    model: 'Object Tracker v2',
    owner: 'Ops AI',
    status: 'completed',
  },
  {
    id: 'VF-1026',
    accuracy: 92.4,
    latencyMs: 81,
    model: 'Scene Classifier v3',
    owner: 'Research',
    status: 'queued',
  },
];

type WorkspaceState = {
  activeWorkspace: string;
  setActiveWorkspace: (workspace: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: 'production',
  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
}));
