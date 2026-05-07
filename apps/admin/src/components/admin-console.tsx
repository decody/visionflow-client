'use client';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Statistic, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { pipelineRuns, type PipelineRun } from '../data/pipeline-runs';
import styles from './admin-console.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const latencyByModel = pipelineRuns.map((run) => ({
  latency: run.latencyMs,
  model: run.model.replace(' ', '\n'),
}));

export function AdminConsole() {
  return (
    <>
      <section className={styles.stats}>
        <Statistic title="Queued Jobs" value={18} />
        <Statistic title="GPU Utilization" value={74} suffix="%" />
        <Statistic title="Incident SLA" value={99.9} suffix="%" precision={1} />
      </section>

      <section className={styles.grid}>
        <div className={styles.chartPanel}>
          <Typography.Title level={4}>Latency by Model</Typography.Title>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={latencyByModel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="latency" fill="#13a37f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`${styles.tablePanel} ag-theme-quartz`}>
          <AgGridReact<PipelineRun>
            theme="legacy"
            rowData={pipelineRuns}
            columnDefs={[
              { field: 'id', headerName: 'Run ID' },
              { field: 'model' },
              { field: 'owner' },
              { field: 'accuracy' },
              { field: 'latencyMs', headerName: 'Latency (ms)' },
              { field: 'status' },
            ]}
            defaultColDef={{
              filter: true,
              flex: 1,
              minWidth: 120,
              sortable: true,
            }}
          />
        </div>
      </section>
    </>
  );
}
