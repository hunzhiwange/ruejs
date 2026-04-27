import { type FC } from '@rue-js/rue'

const dataSources = [
  {
    id: 'mysql',
    name: 'MySQL',
    type: 'SQL',
    icon: 'M',
    status: 'active',
    qps: 12480,
    latency: 3.2,
    connections: 248,
    maxConn: 500,
    uptime: '99.97%',
    color: 'mysql',
    databases: ['erp_prod', 'crm_master', 'ods_layer'],
    querySample: 'SELECT * FROM orders WHERE date >= ?',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    type: 'SQL',
    icon: 'P',
    status: 'active',
    qps: 8920,
    latency: 2.8,
    connections: 176,
    maxConn: 400,
    uptime: '99.99%',
    color: 'pg',
    databases: ['analytics_dw', 'report_stage', 'dim_tables'],
    querySample: 'SELECT SUM(amount) FROM fact_sales GROUP BY dim_date',
  },
  {
    id: 'clickhouse',
    name: 'ClickHouse',
    type: 'OLAP',
    icon: 'C',
    status: 'active',
    qps: 45200,
    latency: 12.5,
    connections: 64,
    maxConn: 200,
    uptime: '99.95%',
    color: 'ch',
    databases: ['bi_engine', 'log_analytics', 'metrics_store'],
    querySample: 'SELECT avg(duration) FROM access_log WHERE ts > now() - INTERVAL 1 HOUR',
  },
  {
    id: 'redis',
    name: 'Redis Cluster',
    type: 'CACHE',
    icon: 'R',
    status: 'active',
    qps: 285000,
    latency: 0.12,
    connections: 512,
    maxConn: 1000,
    uptime: '99.999%',
    color: 'redis',
    databases: ['cache-session', 'cache-report', 'realtime-metrics'],
    querySample: 'GET report:dashboard:daily:20260422',
  },
  {
    id: 'rest-api',
    name: 'REST API',
    type: 'HTTP',
    icon: 'A',
    status: 'warning',
    qps: 3200,
    latency: 45.6,
    connections: 96,
    maxConn: 200,
    uptime: '99.82%',
    color: 'api',
    databases: ['/api/v2/sales', '/api/v2/inventory', '/api/v2/users'],
    querySample: 'GET /api/v2/sales/aggregate?period=monthly',
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    type: 'HTTP',
    icon: 'G',
    status: 'active',
    qps: 5600,
    latency: 18.3,
    connections: 128,
    maxConn: 300,
    uptime: '99.91%',
    color: 'gql',
    databases: ['Query.sales', 'Query.inventory', 'Mutation.sync'],
    querySample: '{ sales(filter: {date: {gte: "2026-04"}}) { total count } }',
  },
]

const pipelineStages = [
  {
    id: 'ingest',
    name: '数据采集',
    desc: '实时 CDC + 批量 ETL',
    icon: '⬇',
    items: ['Debezium CDC', 'Airflow ETL', 'Fluentd Log'],
  },
  {
    id: 'transform',
    name: '数据清洗',
    desc: '标准化 / 去重 / 关联',
    icon: '⚙',
    items: ['Spark Transform', 'dbt Models', 'Great Expectations'],
  },
  {
    id: 'storage',
    name: '数据存储',
    desc: '分层仓储 ODS/DWD/DWS/ADS',
    icon: '🗄',
    items: ['Hive Metastore', 'Iceberg Tables', 'Redis Cache'],
  },
  {
    id: 'serve',
    name: '数据服务',
    desc: 'API 网关 + 查询引擎',
    icon: '⚡',
    items: ['GraphQL Engine', 'REST Gateway', 'SQL Proxy'],
  },
  {
    id: 'visual',
    name: '可视化层',
    desc: '报表 / 仪表盘 / 大屏',
    icon: '📊',
    items: ['BI Dashboard', 'Report Builder', 'Realtime Screen'],
  },
]

const realtimeMetrics = [
  { label: '总 QPS', value: '360,120', delta: '+12.4%', up: true },
  { label: '平均延迟', value: '6.8ms', delta: '-8.2%', up: true },
  { label: '活跃连接', value: '1,224', delta: '+3.1%', up: true },
  { label: '数据吞吐', value: '2.4TB/h', delta: '+18.7%', up: true },
  { label: '任务成功率', value: '99.86%', delta: '+0.05%', up: true },
  { label: '异常告警', value: '3', delta: '-57.1%', up: true },
]

const latencyChartData = [
  { label: '00:00', mysql: 2.1, pg: 1.8, ch: 8.2, redis: 0.08, api: 32.1, gql: 14.2 },
  { label: '04:00', mysql: 1.9, pg: 1.6, ch: 7.5, redis: 0.07, api: 28.4, gql: 12.8 },
  { label: '08:00', mysql: 3.8, pg: 3.2, ch: 15.1, redis: 0.14, api: 52.3, gql: 22.1 },
  { label: '12:00', mysql: 4.2, pg: 3.6, ch: 18.4, redis: 0.16, api: 68.7, gql: 28.5 },
  { label: '16:00', mysql: 3.5, pg: 3.0, ch: 14.2, redis: 0.13, api: 45.8, gql: 19.4 },
  { label: '20:00', mysql: 2.8, pg: 2.4, ch: 11.3, redis: 0.1, api: 38.2, gql: 16.8 },
  { label: 'Now', mysql: 3.2, pg: 2.8, ch: 12.5, redis: 0.12, api: 45.6, gql: 18.3 },
]

const throughputs = [
  { time: 'Mon', value: 1.8 },
  { time: 'Tue', value: 2.1 },
  { time: 'Wed', value: 2.6 },
  { time: 'Thu', value: 2.4 },
  { time: 'Fri', value: 3.1 },
  { time: 'Sat', value: 1.9 },
  { time: 'Sun', value: 2.4 },
]

const topQueries = [
  {
    rank: 1,
    sql: 'SELECT SUM(gmv) FROM fact_daily WHERE ds = ?',
    source: 'ClickHouse',
    freq: '2,400/h',
    avgMs: 8.2,
  },
  {
    rank: 2,
    sql: 'SELECT COUNT(DISTINCT uid) FROM access_log WHERE ...',
    source: 'ClickHouse',
    freq: '1,800/h',
    avgMs: 12.4,
  },
  {
    rank: 3,
    sql: 'GET report:dashboard:realtime:*',
    source: 'Redis',
    freq: '12,000/h',
    avgMs: 0.08,
  },
  {
    rank: 4,
    sql: 'SELECT * FROM orders WHERE status = ? LIMIT 100',
    source: 'MySQL',
    freq: '960/h',
    avgMs: 3.4,
  },
  {
    rank: 5,
    sql: '{ sales { daily { amount count } } }',
    source: 'GraphQL',
    freq: '680/h',
    avgMs: 18.1,
  },
  {
    rank: 6,
    sql: 'SELECT dim_region, SUM(revenue) FROM dws_sales ...',
    source: 'PostgreSQL',
    freq: '520/h',
    avgMs: 2.6,
  },
  {
    rank: 7,
    sql: 'GET /api/v2/inventory/snapshot?warehouse=ALL',
    source: 'REST API',
    freq: '340/h',
    avgMs: 52.3,
  },
  {
    rank: 8,
    sql: 'SELECT avg(duration_ms) FROM metrics WHERE ts > ...',
    source: 'ClickHouse',
    freq: '1,200/h',
    avgMs: 6.8,
  },
]

const alertEvents = [
  {
    time: '14:32:08',
    level: 'warn',
    source: 'REST API',
    message: 'P99 延迟超过 200ms 阈值 (当前 218ms)',
    resolved: true,
  },
  {
    time: '13:18:45',
    level: 'error',
    source: 'MySQL',
    message: '慢查询告警: DELETE FROM log_table 执行 12.3s',
    resolved: true,
  },
  {
    time: '11:05:22',
    level: 'warn',
    source: 'Redis',
    message: 'Node-3 内存使用率达 88%',
    resolved: false,
  },
  {
    time: '09:47:11',
    level: 'info',
    source: 'ClickHouse',
    message: 'Part merge 完成，释放 42GB 磁盘空间',
    resolved: true,
  },
  {
    time: '08:22:33',
    level: 'error',
    source: 'GraphQL',
    message: 'Schema 注册中心连接超时 3 次',
    resolved: true,
  },
  {
    time: '06:15:07',
    level: 'info',
    source: 'Airflow',
    message: 'ETL dag_daily_sales 执行成功，耗时 4m32s',
    resolved: true,
  },
]

const chartW = 700
const chartH = 220
const cPad = { t: 20, r: 16, b: 36, l: 16 }
const plotW = chartW - cPad.l - cPad.r
const plotH = chartH - cPad.t - cPad.b
const maxLatency = 80

const latencyLines = latencyChartData.map(d => {
  const x =
    cPad.l + (plotW / Math.max(latencyChartData.length - 1, 1)) * latencyChartData.indexOf(d)
  return {
    ...d,
    x,
    mysqlY: cPad.t + plotH - (d.mysql / maxLatency) * plotH,
    pgY: cPad.t + plotH - (d.pg / maxLatency) * plotH,
    redisY: cPad.t + plotH - (d.redis / maxLatency) * plotH,
    apiY: cPad.t + plotH - (d.api / maxLatency) * plotH,
  }
})

const makePath = (field: 'mysqlY' | 'pgY' | 'redisY' | 'apiY') =>
  latencyLines.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p[field]}`).join(' ')

const maxThroughput = Math.max(...throughputs.map(t => t.value))

const biStyles = `
.bi-scope.bi-page {
  --b-bg: var(--color-base-100);
  --b-bg2: var(--color-base-200);
  --b-bg3: var(--color-base-300);
  --b-c: var(--color-base-content);
  --b-p: var(--color-primary);
  --b-pc: var(--color-primary-content);
  --b-s: var(--color-secondary);
  --b-sc: var(--color-secondary-content);
  --b-a: var(--color-accent);
  --b-ac: var(--color-accent-content);
  --b-ok: oklch(0.72 0.19 155);
  --b-warn: oklch(0.75 0.18 75);
  --b-err: oklch(0.65 0.22 25);
  --b-mysql: oklch(0.65 0.2 250);
  --b-pg: oklch(0.6 0.18 165);
  --b-ch: oklch(0.72 0.2 300);
  --b-redis: oklch(0.65 0.24 15);
  --b-api: oklch(0.68 0.16 85);
  --b-gql: oklch(0.7 0.2 280);
  --b-glass: color-mix(in oklch, var(--b-bg2) 55%, transparent);
  --b-glass2: color-mix(in oklch, var(--b-bg3) 35%, transparent);

  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 0 24px;
  font-family: 'Inter', 'SF Pro Display', -apple-system, sans-serif;
}

@media (min-width: 768px) { .bi-scope.bi-page { padding: 0 36px; } }
@media (min-width: 1280px) { .bi-scope.bi-page { padding: 0 48px; } }

.bi-scope .bi-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid var(--b-glass2);
  background:
    radial-gradient(ellipse 70% 50% at 100% -10%, color-mix(in oklch, var(--b-p) 12%, transparent), transparent),
    radial-gradient(ellipse 50% 60% at 0% 110%, color-mix(in oklch, var(--b-s) 8%, transparent), transparent),
    var(--b-glass);
  box-shadow:
    0 4px 24px color-mix(in oklch, var(--b-bg3) 25%, transparent),
    0 16px 48px -8px color-mix(in oklch, var(--b-bg3) 35%, transparent);
  backdrop-filter: blur(4px);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.bi-scope .bi-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--b-p) 25%, transparent),
    transparent 40%,
    transparent 60%,
    color-mix(in oklch, var(--b-a) 18%, transparent)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.5;
  transition: opacity 0.4s ease;
}

.bi-scope .bi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px color-mix(in oklch, var(--b-p) 10%, transparent), 0 24px 64px -8px color-mix(in oklch, var(--b-bg3) 35%, transparent); }
.bi-scope .bi-card:hover::before { opacity: 1; }

.bi-scope .bi-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(340px, 0.85fr);
  gap: 32px;
  padding: 40px;
}

.bi-scope .bi-kicker {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--b-p);
}

.bi-scope .bi-hero h1 {
  margin: 0;
  font-size: clamp(30px, 4.5vw, 52px);
  line-height: 1.08;
  font-weight: 800;
  color: var(--b-c);
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, var(--b-c) 40%, var(--b-p));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.bi-scope .bi-hero-desc {
  margin: 18px 0 0;
  max-width: 60ch;
  line-height: 1.8;
  color: color-mix(in oklch, var(--b-c) 65%, transparent);
}

.bi-scope .bi-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.bi-scope .bi-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  border: 1px solid color-mix(in oklch, var(--b-p) 25%, transparent);
  background: color-mix(in oklch, var(--b-p) 10%, transparent);
  color: var(--b-p);
  transition: all 0.3s ease;
}

.bi-scope .bi-tag:hover {
  background: color-mix(in oklch, var(--b-p) 20%, transparent);
  transform: translateY(-1px);
}

.bi-scope .bi-tag .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--b-ok);
  box-shadow: 0 0 8px color-mix(in oklch, var(--b-ok) 50%, transparent);
  animation: biPulse 2s ease-in-out infinite;
}

.bi-scope .bi-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.bi-scope .bi-metric-card {
  padding: 20px;
  border-radius: 18px;
  background: color-mix(in oklch, var(--b-bg3) 40%, var(--b-bg2));
  border: 1px solid color-mix(in oklch, var(--b-bg3) 40%, transparent);
  transition: all 0.3s ease;
}

.bi-scope .bi-metric-card:hover {
  background: color-mix(in oklch, var(--b-bg3) 55%, var(--b-bg2));
  transform: translateY(-2px);
}

.bi-scope .bi-metric-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--b-c) 50%, transparent);
}

.bi-scope .bi-metric-value {
  margin-top: 8px;
  font-size: clamp(24px, 2.5vw, 34px);
  font-weight: 800;
  color: var(--b-c);
  line-height: 1;
}

.bi-scope .bi-metric-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.bi-scope .bi-metric-delta.up {
  color: var(--b-ok);
  background: color-mix(in oklch, var(--b-ok) 12%, transparent);
}

.bi-scope .bi-metric-delta.down {
  color: var(--b-err);
  background: color-mix(in oklch, var(--b-err) 12%, transparent);
}

.bi-scope .bi-section-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.bi-scope .bi-section-title h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  color: var(--b-c);
}

.bi-scope .bi-section-title p {
  margin: 0;
  font-size: 14px;
  color: color-mix(in oklch, var(--b-c) 55%, transparent);
  max-width: 36ch;
}

.bi-scope .bi-eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--b-p);
}

.bi-scope .bi-sources-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  padding: 28px;
}

.bi-scope .bi-src {
  padding: 22px;
  border-radius: 20px;
  background: color-mix(in oklch, var(--b-bg2) 35%, var(--b-bg));
  border: 1px solid color-mix(in oklch, var(--b-bg3) 30%, transparent);
  transition: all 0.35s ease;
  cursor: default;
}

.bi-scope .bi-src:hover {
  background: color-mix(in oklch, var(--b-bg2) 55%, var(--b-bg));
  border-color: color-mix(in oklch, var(--b-bg3) 55%, transparent);
  transform: translateY(-3px);
  box-shadow: 0 12px 32px color-mix(in oklch, var(--b-bg3) 25%, transparent);
}

.bi-scope .bi-src-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bi-scope .bi-src-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 900;
  color: white;
  flex-shrink: 0;
}

.bi-scope .bi-src-icon.mysql { background: linear-gradient(135deg, var(--b-mysql), oklch(0.5 0.15 250)); }
.bi-scope .bi-src-icon.pg { background: linear-gradient(135deg, var(--b-pg), oklch(0.45 0.12 165)); }
.bi-scope .bi-src-icon.ch { background: linear-gradient(135deg, var(--b-ch), oklch(0.55 0.15 300)); }
.bi-scope .bi-src-icon.redis { background: linear-gradient(135deg, var(--b-redis), oklch(0.5 0.18 15)); }
.bi-scope .bi-src-icon.api { background: linear-gradient(135deg, var(--b-api), oklch(0.5 0.12 85)); }
.bi-scope .bi-src-icon.gql { background: linear-gradient(135deg, var(--b-gql), oklch(0.55 0.15 280)); }

.bi-scope .bi-src-name {
  font-size: 17px;
  font-weight: 800;
  color: var(--b-c);
}

.bi-scope .bi-src-type {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
}

.bi-scope .bi-src-type.sql { color: var(--b-mysql); background: color-mix(in oklch, var(--b-mysql) 12%, transparent); }
.bi-scope .bi-src-type.olap { color: var(--b-ch); background: color-mix(in oklch, var(--b-ch) 12%, transparent); }
.bi-scope .bi-src-type.cache { color: var(--b-redis); background: color-mix(in oklch, var(--b-redis) 12%, transparent); }
.bi-scope .bi-src-type.http { color: var(--b-api); background: color-mix(in oklch, var(--b-api) 12%, transparent); }

.bi-scope .bi-src-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in oklch, var(--b-bg3) 40%, transparent);
}

.bi-scope .bi-src-stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--b-c) 45%, transparent);
}

.bi-scope .bi-src-stat-value {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
  color: var(--b-c);
}

.bi-scope .bi-src-stat-unit {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in oklch, var(--b-c) 50%, transparent);
}

.bi-scope .bi-src-conn-bar {
  width: 100%;
  height: 4px;
  border-radius: 999px;
  margin-top: 6px;
  background: color-mix(in oklch, var(--b-c) 8%, transparent);
  overflow: hidden;
}

.bi-scope .bi-src-conn-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}

.bi-scope .bi-src-conn-fill.mysql { background: var(--b-mysql); }
.bi-scope .bi-src-conn-fill.pg { background: var(--b-pg); }
.bi-scope .bi-src-conn-fill.ch { background: var(--b-ch); }
.bi-scope .bi-src-conn-fill.redis { background: var(--b-redis); }
.bi-scope .bi-src-conn-fill.api { background: var(--b-api); }
.bi-scope .bi-src-conn-fill.gql { background: var(--b-gql); }

.bi-scope .bi-src-dbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.bi-scope .bi-src-db {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--b-bg3) 50%, var(--b-bg2));
  color: color-mix(in oklch, var(--b-c) 60%, transparent);
  border: 1px solid color-mix(in oklch, var(--b-bg3) 40%, transparent);
}

.bi-scope .bi-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bi-scope .bi-status-dot.active { background: var(--b-ok); box-shadow: 0 0 10px color-mix(in oklch, var(--b-ok) 50%, transparent); }
.bi-scope .bi-status-dot.warning { background: var(--b-warn); box-shadow: 0 0 10px color-mix(in oklch, var(--b-warn) 50%, transparent); animation: biPulse 1.5s ease-in-out infinite; }

.bi-scope .bi-pipeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  padding: 28px;
  position: relative;
}

.bi-scope .bi-pipe-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 20px 12px;
  position: relative;
  z-index: 1;
}

.bi-scope .bi-pipe-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 24px;
  background: linear-gradient(135deg, color-mix(in oklch, var(--b-p) 20%, var(--b-bg2)), color-mix(in oklch, var(--b-a) 15%, var(--b-bg3)));
  border: 1px solid color-mix(in oklch, var(--b-p) 25%, transparent);
  box-shadow: 0 4px 16px color-mix(in oklch, var(--b-p) 12%, transparent);
  transition: all 0.3s ease;
}

.bi-scope .bi-pipe-stage:hover .bi-pipe-icon {
  transform: scale(1.1);
  box-shadow: 0 8px 24px color-mix(in oklch, var(--b-p) 20%, transparent);
}

.bi-scope .bi-pipe-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--b-c);
}

.bi-scope .bi-pipe-desc {
  font-size: 12px;
  color: color-mix(in oklch, var(--b-c) 55%, transparent);
  line-height: 1.6;
}

.bi-scope .bi-pipe-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.bi-scope .bi-pipe-item {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--b-bg3) 45%, var(--b-bg2));
  color: color-mix(in oklch, var(--b-c) 60%, transparent);
  border: 1px solid color-mix(in oklch, var(--b-bg3) 35%, transparent);
  white-space: nowrap;
}

.bi-scope .bi-pipe-arrow {
  position: absolute;
  top: 48px;
  right: -14px;
  width: 28px;
  height: 2px;
  z-index: 0;
}

.bi-scope .bi-pipe-arrow::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--b-p), var(--b-a));
  opacity: 0.4;
}

.bi-scope .bi-pipe-arrow::after {
  content: '';
  position: absolute;
  right: 0;
  top: -4px;
  border: 5px solid transparent;
  border-left: 7px solid var(--b-a);
  opacity: 0.4;
}

.bi-scope .bi-chart-section {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.85fr);
  gap: 20px;
}

.bi-scope .bi-chart-card {
  padding: 28px;
}

.bi-scope .bi-chart-shell {
  overflow: hidden;
  border-radius: 20px;
  background: color-mix(in oklch, var(--b-bg3) 40%, var(--b-bg2));
  border: 1px solid color-mix(in oklch, var(--b-bg3) 40%, transparent);
  box-shadow: inset 0 2px 10px color-mix(in oklch, var(--b-bg3) 20%, transparent);
}

.bi-scope .bi-chart-svg {
  display: block;
  width: 100%;
  height: auto;
}

.bi-scope .bi-grid-line {
  stroke: color-mix(in oklch, var(--b-c) 8%, transparent);
  stroke-width: 1;
  stroke-dasharray: 4 8;
}

.bi-scope .bi-grid-label {
  font-size: 10px;
  fill: color-mix(in oklch, var(--b-c) 40%, transparent);
}

.bi-scope .bi-axis-label {
  font-size: 10px;
  fill: color-mix(in oklch, var(--b-c) 45%, transparent);
}

.bi-scope .bi-line-path {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.bi-scope .bi-tp-card { padding: 28px; }

.bi-scope .bi-tp-bars {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  min-height: 180px;
  padding: 16px;
  border-radius: 20px;
  background: color-mix(in oklch, var(--b-bg3) 35%, var(--b-bg2));
  border: 1px solid color-mix(in oklch, var(--b-bg3) 35%, transparent);
}

.bi-scope .bi-tp-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.bi-scope .bi-tp-bar-shell {
  width: 100%;
  height: 130px;
  display: flex;
  align-items: flex-end;
}

.bi-scope .bi-tp-fill {
  width: 100%;
  min-height: 8px;
  border-radius: 14px 14px 4px 4px;
  background: linear-gradient(180deg, color-mix(in oklch, var(--b-p) 80%, var(--b-a)), color-mix(in oklch, var(--b-p) 20%, transparent));
  box-shadow: 0 6px 20px color-mix(in oklch, var(--b-p) 18%, transparent);
  transition: all 0.3s ease;
}

.bi-scope .bi-tp-fill:hover {
  filter: brightness(1.15);
  box-shadow: 0 8px 28px color-mix(in oklch, var(--b-p) 28%, transparent);
}

.bi-scope .bi-tp-val {
  font-size: 15px;
  font-weight: 800;
  color: var(--b-c);
}

.bi-scope .bi-tp-label {
  font-size: 11px;
  color: color-mix(in oklch, var(--b-c) 50%, transparent);
}

.bi-scope .bi-queries-card { padding: 28px; }

.bi-scope .bi-query-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1.2fr) auto auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background: color-mix(in oklch, var(--b-bg2) 25%, var(--b-bg));
  border: 1px solid color-mix(in oklch, var(--b-bg3) 25%, transparent);
  transition: all 0.3s ease;
}

.bi-scope .bi-query-row:hover {
  background: color-mix(in oklch, var(--b-bg2) 45%, var(--b-bg));
  transform: translateX(4px);
}

.bi-scope .bi-query-row + .bi-query-row {
  margin-top: 10px;
}

.bi-scope .bi-query-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: var(--b-c);
  background: color-mix(in oklch, var(--b-bg3) 45%, var(--b-bg2));
}

.bi-scope .bi-query-rank.top3 {
  background: linear-gradient(135deg, var(--b-p), var(--b-a));
  color: white;
}

.bi-scope .bi-query-sql {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: color-mix(in oklch, var(--b-c) 70%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bi-scope .bi-query-src {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.bi-scope .bi-query-src.mysql { color: var(--b-mysql); background: color-mix(in oklch, var(--b-mysql) 10%, transparent); }
.bi-scope .bi-query-src.pg { color: var(--b-pg); background: color-mix(in oklch, var(--b-pg) 10%, transparent); }
.bi-scope .bi-query-src.ch { color: var(--b-ch); background: color-mix(in oklch, var(--b-ch) 10%, transparent); }
.bi-scope .bi-query-src.redis { color: var(--b-redis); background: color-mix(in oklch, var(--b-redis) 10%, transparent); }
.bi-scope .bi-query-src.api { color: var(--b-api); background: color-mix(in oklch, var(--b-api) 10%, transparent); }
.bi-scope .bi-query-src.gql { color: var(--b-gql); background: color-mix(in oklch, var(--b-gql) 10%, transparent); }

.bi-scope .bi-query-freq {
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in oklch, var(--b-c) 60%, transparent);
  white-space: nowrap;
}

.bi-scope .bi-query-ms {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.bi-scope .bi-query-ms.fast { color: var(--b-ok); }
.bi-scope .bi-query-ms.med { color: var(--b-warn); }
.bi-scope .bi-query-ms.slow { color: var(--b-err); }

.bi-scope .bi-alert-card { padding: 28px; }

.bi-scope .bi-alert-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background: color-mix(in oklch, var(--b-bg2) 25%, var(--b-bg));
  border: 1px solid color-mix(in oklch, var(--b-bg3) 25%, transparent);
  transition: all 0.3s ease;
}

.bi-scope .bi-alert-row:hover {
  background: color-mix(in oklch, var(--b-bg2) 45%, var(--b-bg));
  transform: translateX(4px);
}

.bi-scope .bi-alert-row + .bi-alert-row {
  margin-top: 10px;
}

.bi-scope .bi-alert-time {
  font-size: 12px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: color-mix(in oklch, var(--b-c) 50%, transparent);
  white-space: nowrap;
}

.bi-scope .bi-alert-level {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.bi-scope .bi-alert-level.error { color: var(--b-err); background: color-mix(in oklch, var(--b-err) 12%, transparent); }
.bi-scope .bi-alert-level.warn { color: var(--b-warn); background: color-mix(in oklch, var(--b-warn) 12%, transparent); }
.bi-scope .bi-alert-level.info { color: var(--b-p); background: color-mix(in oklch, var(--b-p) 12%, transparent); }

.bi-scope .bi-alert-msg {
  font-size: 13px;
  color: color-mix(in oklch, var(--b-c) 70%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bi-scope .bi-alert-resolved {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.bi-scope .bi-alert-resolved.yes { color: var(--b-ok); background: color-mix(in oklch, var(--b-ok) 10%, transparent); }
.bi-scope .bi-alert-resolved.no { color: var(--b-warn); background: color-mix(in oklch, var(--b-warn) 10%, transparent); }

.bi-scope .bi-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 20px;
}

@keyframes biPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes biFloatIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.bi-scope .bi-card {
  animation: biFloatIn 0.6s ease both;
}

.bi-scope .bi-metric-card:nth-child(1) { animation: biFloatIn 0.5s ease both; animation-delay: 0ms; }
.bi-scope .bi-metric-card:nth-child(2) { animation: biFloatIn 0.5s ease both; animation-delay: 60ms; }
.bi-scope .bi-metric-card:nth-child(3) { animation: biFloatIn 0.5s ease both; animation-delay: 120ms; }
.bi-scope .bi-metric-card:nth-child(4) { animation: biFloatIn 0.5s ease both; animation-delay: 180ms; }
.bi-scope .bi-metric-card:nth-child(5) { animation: biFloatIn 0.5s ease both; animation-delay: 240ms; }
.bi-scope .bi-metric-card:nth-child(6) { animation: biFloatIn 0.5s ease both; animation-delay: 300ms; }

@media (max-width: 1100px) {
  .bi-scope .bi-hero { grid-template-columns: 1fr; }
  .bi-scope .bi-sources-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bi-scope .bi-pipeline { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .bi-scope .bi-chart-section,
  .bi-scope .bi-bottom-grid { grid-template-columns: 1fr; }
  .bi-scope .bi-metrics-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .bi-scope.bi-page { padding: 0 12px; gap: 16px; }
  .bi-scope .bi-sources-grid { grid-template-columns: 1fr; }
  .bi-scope .bi-pipeline { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bi-scope .bi-metrics-grid { grid-template-columns: 1fr; }
  .bi-scope .bi-hero { padding: 24px; }
  .bi-scope .bi-query-row { grid-template-columns: 28px minmax(0, 1fr) auto; }
  .bi-scope .bi-query-src, .bi-scope .bi-query-freq, .bi-scope .bi-query-ms { display: none; }
  .bi-scope .bi-alert-row { grid-template-columns: auto minmax(0, 1fr) auto; }
  .bi-scope .bi-alert-time { display: none; }
}
`

const formatQps = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 1)}K` : String(v)
const formatLatency = (v: number) => (v < 1 ? `${(v * 1000).toFixed(0)}μs` : `${v.toFixed(1)}ms`)

const srcColorMap: Record<string, string> = {
  mysql: 'mysql',
  pg: 'pg',
  ch: 'ch',
  redis: 'redis',
  api: 'api',
  gql: 'gql',
}

const srcTypeMap: Record<string, string> = {
  mysql: 'sql',
  pg: 'sql',
  ch: 'olap',
  redis: 'cache',
  api: 'http',
  gql: 'http',
}

const getQueryMsClass = (ms: number) => (ms < 5 ? 'fast' : ms < 30 ? 'med' : 'slow')

const ReportBiArch: FC = () => (
  <>
    <style>{biStyles}</style>
    <div className="bi-scope bi-page">
      {/* ===== HERO ===== */}
      <section className="bi-hero bi-card">
        <div>
          <p className="bi-kicker">BI Platform Architecture / Realtime Monitor</p>
          <h1>多源异构数据接入架构，实时驱动业务决策</h1>
          <p className="bi-hero-desc">
            统一接入 MySQL、PostgreSQL、ClickHouse、Redis Cluster、REST API、GraphQL 等六大数据源，
            通过 CDC 实时采集 + ETL 批量清洗的混合管道，将数据经过 ODS → DWD → DWS → ADS
            四层治理后， 对外提供毫秒级查询服务。当前集群整体 QPS 达 360K+，平均响应延迟 6.8ms。
          </p>
          <div className="bi-tags">
            <span className="bi-tag">
              <span className="dot" />6 数据源在线
            </span>
            <span className="bi-tag">CDC 实时同步</span>
            <span className="bi-tag">ETL 批处理</span>
            <span className="bi-tag">四层仓储存档</span>
            <span className="bi-tag">GraphQL + REST 双协议</span>
          </div>
        </div>

        <div className="bi-metrics-grid">
          {realtimeMetrics.map(m => (
            <div key={m.label} className="bi-metric-card">
              <div className="bi-metric-label">{m.label}</div>
              <div className="bi-metric-value">{m.value}</div>
              <span
                className={`bi-metric-delta ${m.delta.startsWith('+') ? (m.label === '异常告警' ? 'down' : 'up') : 'up'}`}
              >
                {m.delta}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DATA SOURCES ===== */}
      <section className="bi-card">
        <div style={{ padding: '28px 28px 0' }}>
          <div className="bi-section-title">
            <div>
              <p className="bi-eyebrow">Data Sources</p>
              <h2>数据源连接池</h2>
            </div>
            <p>实时监控六大异构数据源的连接状态、QPS、延迟与健康度。</p>
          </div>
        </div>
        <div className="bi-sources-grid">
          {dataSources.map(src => (
            <div key={src.id} className="bi-src">
              <div className="bi-src-head">
                <div className={`bi-src-icon ${srcColorMap[src.id]}`}>{src.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="bi-src-name">{src.name}</span>
                    <span className={`bi-status-dot ${src.status}`} />
                  </div>
                  <span className={`bi-src-type ${srcTypeMap[src.id]}`}>{src.type}</span>
                </div>
              </div>
              <div className="bi-src-stats">
                <div>
                  <div className="bi-src-stat-label">QPS</div>
                  <div className="bi-src-stat-value">{formatQps(src.qps)}</div>
                </div>
                <div>
                  <div className="bi-src-stat-label">延迟</div>
                  <div className="bi-src-stat-value">{formatLatency(src.latency)}</div>
                </div>
                <div>
                  <div className="bi-src-stat-label">可用率</div>
                  <div className="bi-src-stat-value">{src.uptime}</div>
                </div>
              </div>
              <div className="bi-src-conn-bar">
                <div
                  className={`bi-src-conn-fill ${srcColorMap[src.id]}`}
                  style={{ width: `${(src.connections / src.maxConn) * 100}%` }}
                />
              </div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span className="bi-src-stat-unit">
                  {src.connections} / {src.maxConn} 连接
                </span>
              </div>
              <div className="bi-src-dbs">
                {src.databases.map(db => (
                  <span key={db} className="bi-src-db">
                    {db}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PIPELINE ===== */}
      <section className="bi-card">
        <div style={{ padding: '28px 28px 0' }}>
          <div className="bi-section-title">
            <div>
              <p className="bi-eyebrow">Data Pipeline</p>
              <h2>数据处理管线</h2>
            </div>
            <p>五阶段数据生命周期：从采集到可视化的全链路自动化。</p>
          </div>
        </div>
        <div className="bi-pipeline">
          {pipelineStages.map((stage, idx) => (
            <div key={stage.id} className="bi-pipe-stage">
              <div className="bi-pipe-icon">{stage.icon}</div>
              <div className="bi-pipe-name">{stage.name}</div>
              <div className="bi-pipe-desc">{stage.desc}</div>
              <div className="bi-pipe-items">
                {stage.items.map(item => (
                  <span key={item} className="bi-pipe-item">
                    {item}
                  </span>
                ))}
              </div>
              {idx < pipelineStages.length - 1 && <div className="bi-pipe-arrow" />}
            </div>
          ))}
        </div>
      </section>

      {/* ===== LATENCY CHART + THROUGHPUT ===== */}
      <section className="bi-chart-section">
        <article className="bi-card bi-chart-card">
          <div className="bi-section-title">
            <div>
              <p className="bi-eyebrow">Latency Monitor</p>
              <h2>24H 延迟趋势</h2>
            </div>
          </div>
          <div className="bi-chart-shell">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="bi-chart-svg"
              role="img"
              aria-label="24小时延迟趋势图"
            >
              <defs>
                <linearGradient id="biLatMysql" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--b-mysql)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--b-mysql)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="biLatApi" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--b-api)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--b-api)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map(step => {
                const y = cPad.t + plotH - step * plotH
                return (
                  <g key={step}>
                    <line x1={cPad.l} y1={y} x2={chartW - cPad.r} y2={y} className="bi-grid-line" />
                    <text x={cPad.l + 4} y={y - 6} className="bi-grid-label">
                      {(maxLatency * step).toFixed(0)}ms
                    </text>
                  </g>
                )
              })}

              <path
                d={`${makePath('mysqlY')} L ${latencyLines[latencyLines.length - 1].x} ${cPad.t + plotH} L ${latencyLines[0].x} ${cPad.t + plotH} Z`}
                fill="url(#biLatMysql)"
              />
              <path d={makePath('apiY')} className="bi-line-path" stroke="var(--b-api)" />
              <path d={makePath('mysqlY')} className="bi-line-path" stroke="var(--b-mysql)" />
              <path d={makePath('pgY')} className="bi-line-path" stroke="var(--b-pg)" />
              <path d={makePath('redisY')} className="bi-line-path" stroke="var(--b-redis)" />

              {latencyLines.map(p => (
                <g key={p.label}>
                  <text x={p.x} y={chartH - 8} textAnchor="middle" className="bi-axis-label">
                    {p.label}
                  </text>
                  <circle cx={p.x} cy={p.mysqlY} r={3.5} fill="var(--b-mysql)" opacity="0.85" />
                  <circle cx={p.x} cy={p.pgY} r={3.5} fill="var(--b-pg)" opacity="0.85" />
                  <circle cx={p.x} cy={p.redisY} r={3.5} fill="var(--b-redis)" opacity="0.85" />
                  <circle cx={p.x} cy={p.apiY} r={3.5} fill="var(--b-api)" opacity="0.85" />
                </g>
              ))}

              <g transform={`translate(${chartW - cPad.r - 100}, ${cPad.t + 4})`}>
                <circle cx={0} cy={0} r={4} fill="var(--b-mysql)" />
                <text x={10} y={4} className="bi-axis-label">
                  MySQL
                </text>
                <circle cx={50} cy={0} r={4} fill="var(--b-pg)" />
                <text x={60} y={4} className="bi-axis-label">
                  PG
                </text>
                <circle cx={0} cy={16} r={4} fill="var(--b-redis)" />
                <text x={10} y={20} className="bi-axis-label">
                  Redis
                </text>
                <circle cx={50} cy={16} r={4} fill="var(--b-api)" />
                <text x={60} y={20} className="bi-axis-label">
                  API
                </text>
              </g>
            </svg>
          </div>
        </article>

        <article className="bi-card bi-tp-card">
          <div className="bi-section-title">
            <div>
              <p className="bi-eyebrow">Weekly Throughput</p>
              <h2>周吞吐量</h2>
            </div>
          </div>
          <div className="bi-tp-bars">
            {throughputs.map(tp => (
              <div key={tp.time} className="bi-tp-group">
                <div className="bi-tp-val">{tp.value.toFixed(1)}T</div>
                <div className="bi-tp-bar-shell">
                  <div
                    className="bi-tp-fill"
                    style={{ height: `${Math.max(8, (tp.value / maxThroughput) * 100)}%` }}
                  />
                </div>
                <div className="bi-tp-label">{tp.time}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* ===== TOP QUERIES + ALERTS ===== */}
      <section className="bi-bottom-grid">
        <article className="bi-card bi-queries-card">
          <div className="bi-section-title">
            <div>
              <p className="bi-eyebrow">Top Queries</p>
              <h2>高频查询排行</h2>
            </div>
          </div>
          <div>
            {topQueries.map(q => (
              <div key={q.rank} className="bi-query-row">
                <span className={`bi-query-rank ${q.rank <= 3 ? 'top3' : ''}`}>{q.rank}</span>
                <span className="bi-query-sql">{q.sql}</span>
                <span
                  className={`bi-query-src ${srcColorMap[q.source.toLowerCase().replace(' ', '-')] || srcColorMap[q.source === 'ClickHouse' ? 'ch' : q.source === 'Redis' ? 'redis' : q.source === 'MySQL' ? 'mysql' : q.source === 'PostgreSQL' ? 'pg' : q.source === 'GraphQL' ? 'gql' : 'api']}`}
                >
                  {q.source}
                </span>
                <span className="bi-query-freq">{q.freq}</span>
                <span className={`bi-query-ms ${getQueryMsClass(q.avgMs)}`}>{q.avgMs}ms</span>
              </div>
            ))}
          </div>
        </article>

        <article className="bi-card bi-alert-card">
          <div className="bi-section-title">
            <div>
              <p className="bi-eyebrow">Alert Center</p>
              <h2>告警事件</h2>
            </div>
          </div>
          <div>
            {alertEvents.map((evt, idx) => (
              <div key={idx} className="bi-alert-row">
                <span className="bi-alert-time">{evt.time}</span>
                <span className={`bi-alert-level ${evt.level}`}>{evt.level}</span>
                <span className="bi-alert-msg">{evt.message}</span>
                <span className={`bi-alert-resolved ${evt.resolved ? 'yes' : 'no'}`}>
                  {evt.resolved ? '已恢复' : '处理中'}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  </>
)

export default ReportBiArch
