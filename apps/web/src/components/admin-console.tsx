'use client';

import { pipelineRuns, useWorkspaceStore, type PipelineRun } from '@visionflow/shared';
import { AgGridReact } from 'ag-grid-react';
import { Button, Layout, Segmented, Space, Statistic, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import styles from './admin-console.module.css';

const latencyByModel = pipelineRuns.map((run) => ({
  latency: run.latencyMs,
  model: run.model.replace(' ', '\n'),
}));

export function AdminConsole() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

  return (
    <Layout className={styles.shell}>
      <aside className={styles.sidebar}>
        <Typography.Title level={3}>VisionFlow</Typography.Title>
        <Segmented
          block
          value={activeWorkspace}
          onChange={(value) => setActiveWorkspace(String(value))}
          options={[
            { label: 'Prod', value: 'production' },
            { label: 'Stage', value: 'staging' },
          ]}
        />
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <Typography.Title level={2}>Admin Console</Typography.Title>
            <Typography.Text type="secondary">Pipeline health and model operations</Typography.Text>
          </div>
          <Space>
            <Button>Export</Button>
            <Button type="primary">New Pipeline</Button>
          </Space>
        </header>

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
      </main>
    </Layout>
  );
}
