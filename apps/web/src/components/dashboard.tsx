'use client';

import { Canvas } from '@react-three/fiber';
import { useQuery } from '@tanstack/react-query';
import {
  dashboardMetrics,
  pipelineRuns,
  useWorkspaceStore,
  type PipelineRun,
} from '@visionflow/shared';
import { Statistic, Table, Tag, Typography } from 'antd';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './dashboard.module.css';

const trend = [
  { name: '09:00', frames: 18_400 },
  { name: '10:00', frames: 22_200 },
  { name: '11:00', frames: 24_700 },
  { name: '12:00', frames: 29_300 },
  { name: '13:00', frames: 31_000 },
];

function StatusTag({ status }: Readonly<{ status: PipelineRun['status'] }>) {
  const color = {
    completed: 'green',
    failed: 'red',
    queued: 'gold',
    running: 'blue',
  }[status];

  return <Tag color={color}>{status.toUpperCase()}</Tag>;
}

function ScenePreview() {
  return (
    <Canvas camera={{ position: [0, 0, 4] }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 3, 3]} intensity={1.8} />
      <mesh rotation={[0.6, 0.7, 0]}>
        <boxGeometry args={[1.6, 1.6, 1.6]} />
        <meshStandardMaterial color="#2f6fed" roughness={0.35} />
      </mesh>
    </Canvas>
  );
}

export function Dashboard() {
  const { activeWorkspace } = useWorkspaceStore();
  const { data = pipelineRuns } = useQuery({
    queryKey: ['pipeline-runs', activeWorkspace],
    queryFn: async () => pipelineRuns,
  });

  return (
    <>
      <section className={styles.metrics}>
        {dashboardMetrics.map((metric) => (
          <div className={styles.metric} key={metric.id}>
            <Statistic
              title={metric.label}
              value={metric.value}
              precision={metric.id === 'accuracy' ? 1 : 0}
              suffix={metric.id === 'accuracy' ? '%' : undefined}
            />
            <Typography.Text type={metric.delta > 0 ? 'success' : 'danger'}>
              {metric.delta > 0 ? '+' : ''}
              {metric.delta}% this week
            </Typography.Text>
          </div>
        ))}
      </section>

      <section className={styles.panels}>
        <div className={styles.panel}>
          <Typography.Title level={4}>Frame Throughput</Typography.Title>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area dataKey="frames" fill="#2f6fed" fillOpacity={0.18} stroke="#2f6fed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.preview}>
          <ScenePreview />
        </div>
      </section>

      <div className={styles.tableWrap}>
        <Table<PipelineRun>
          rowKey="id"
          dataSource={data}
          pagination={false}
          scroll={{ x: 760 }}
          columns={[
            { dataIndex: 'id', title: 'Run ID' },
            { dataIndex: 'model', title: 'Model' },
            { dataIndex: 'owner', title: 'Owner' },
            { dataIndex: 'accuracy', title: 'Accuracy', render: (value: number) => `${value}%` },
            { dataIndex: 'latencyMs', title: 'Latency', render: (value: number) => `${value}ms` },
            {
              dataIndex: 'status',
              title: 'Status',
              render: (status) => <StatusTag status={status} />,
            },
          ]}
        />
      </div>
    </>
  );
}
