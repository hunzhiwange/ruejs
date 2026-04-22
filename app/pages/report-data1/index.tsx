import { type FC } from '@rue-js/rue'

type DailyReportRow = {
  sumDate: string
  ordersCount: number
  ordersClients: number
  returnsCount: number
  returnsClients: number
  ordersTotal: number
  returnsTotal: number
  allAmount: number
  avgClientPrice: number
  selfOrderClients: number
  selfOrderTotal: number
  adminOrderClients: number
  adminOrderTotal: number
}

const rawRows = [
  {
    sum_date: '2026-03-18',
    orders_count: 0,
    orders_clients: 0,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '0.00',
    returns_total: '0.00',
    all_amount: '0.00',
    avg_client_price: '0.00',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 0,
    admin_order_total: '0.00',
  },
  {
    sum_date: '2026-03-19',
    orders_count: 0,
    orders_clients: 0,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '0.00',
    returns_total: '0.00',
    all_amount: '0.00',
    avg_client_price: '0.00',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 0,
    admin_order_total: '0.00',
  },
  {
    sum_date: '2026-03-20',
    orders_count: 0,
    orders_clients: 0,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '0.00',
    returns_total: '0.00',
    all_amount: '0.00',
    avg_client_price: '0.00',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 0,
    admin_order_total: '0.00',
  },
  {
    sum_date: '2026-03-21',
    orders_count: 0,
    orders_clients: 0,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '0.00',
    returns_total: '0.00',
    all_amount: '0.00',
    avg_client_price: '0.00',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 0,
    admin_order_total: '0.00',
  },
  {
    sum_date: '2026-03-22',
    orders_count: 0,
    orders_clients: 0,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '0.00',
    returns_total: '0.00',
    all_amount: '0.00',
    avg_client_price: '0.00',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 0,
    admin_order_total: '0.00',
  },
  {
    sum_date: '2026-03-23',
    orders_count: 1,
    orders_clients: 1,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '57.50',
    returns_total: '0.00',
    all_amount: '57.50',
    avg_client_price: '57.50',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 1,
    admin_order_total: '57.50',
  },
  {
    sum_date: '2026-03-24',
    orders_count: 4,
    orders_clients: 2,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '1568363.40',
    returns_total: '0.00',
    all_amount: '1568363.40',
    avg_client_price: '392090.85',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 2,
    admin_order_total: '1568363.40',
  },
  {
    sum_date: '2026-03-25',
    orders_count: 2,
    orders_clients: 2,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '1475.00',
    returns_total: '0.00',
    all_amount: '1475.00',
    avg_client_price: '737.50',
    self_order_clients: 0,
    self_order_total: '0.00',
    admin_order_clients: 2,
    admin_order_total: '1475.00',
  },
  {
    sum_date: '2026-03-26',
    orders_count: 6,
    orders_clients: 1,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '19291.50',
    returns_total: '0.00',
    all_amount: '19291.50',
    avg_client_price: '3215.25',
    self_order_clients: 1,
    self_order_total: '19291.50',
    admin_order_clients: 0,
    admin_order_total: '0.00',
  },
  {
    sum_date: '2026-03-27',
    orders_count: 8,
    orders_clients: 1,
    returns_count: 0,
    returns_clients: 0,
    orders_total: '48337.00',
    returns_total: '0.00',
    all_amount: '48337.00',
    avg_client_price: '6042.13',
    self_order_clients: 1,
    self_order_total: '11122.00',
    admin_order_clients: 1,
    admin_order_total: '37215.00',
  },
] as const

const rows: DailyReportRow[] = rawRows.map(row => ({
  sumDate: row.sum_date,
  ordersCount: row.orders_count,
  ordersClients: row.orders_clients,
  returnsCount: row.returns_count,
  returnsClients: row.returns_clients,
  ordersTotal: Number(row.orders_total),
  returnsTotal: Number(row.returns_total),
  allAmount: Number(row.all_amount),
  avgClientPrice: Number(row.avg_client_price),
  selfOrderClients: row.self_order_clients,
  selfOrderTotal: Number(row.self_order_total),
  adminOrderClients: row.admin_order_clients,
  adminOrderTotal: Number(row.admin_order_total),
}))

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('zh-CN')

const totalOrders = rows.reduce((sum, row) => sum + row.ordersCount, 0)
const totalAmount = rows.reduce((sum, row) => sum + row.allAmount, 0)
const totalReturnsAmount = rows.reduce((sum, row) => sum + row.returnsTotal, 0)
const activeDays = rows.filter(row => row.ordersCount > 0).length
const inactiveDays = rows.length - activeDays
const totalAdminAmount = rows.reduce((sum, row) => sum + row.adminOrderTotal, 0)
const totalSelfAmount = rows.reduce((sum, row) => sum + row.selfOrderTotal, 0)
const totalClientRecords = rows.reduce((sum, row) => sum + row.ordersClients, 0)
const peakRow = rows.reduce((currentPeak, row) =>
  row.allAmount > currentPeak.allAmount ? row : currentPeak,
)
const peakShare = totalAmount > 0 ? peakRow.allAmount / totalAmount : 0
const adminShare = totalAmount > 0 ? totalAdminAmount / totalAmount : 0
const selfShare = totalAmount > 0 ? totalSelfAmount / totalAmount : 0
const activeDayAverage = activeDays > 0 ? totalAmount / activeDays : 0
const orderAverage = totalOrders > 0 ? totalAmount / totalOrders : 0

const chartWidth = 760
const chartHeight = 300
const chartPadding = { top: 24, right: 18, bottom: 42, left: 18 }
const plotWidth = chartWidth - chartPadding.left - chartPadding.right
const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
const maxAmount = Math.max(...rows.map(row => row.allAmount), 1)
const maxOrders = Math.max(...rows.map(row => row.ordersCount), 1)

const amountPoints = rows.map((row, index) => {
  const x = chartPadding.left + (plotWidth / Math.max(rows.length - 1, 1)) * index
  const y = chartPadding.top + plotHeight - (row.allAmount / maxAmount) * plotHeight

  return {
    row,
    x,
    y,
  }
})

const amountPath = amountPoints
  .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
  .join(' ')

const areaPath = `${amountPath} L ${amountPoints[amountPoints.length - 1]?.x ?? 0} ${chartHeight - chartPadding.bottom} L ${amountPoints[0]?.x ?? 0} ${chartHeight - chartPadding.bottom} Z`

const gridSteps = [0, 0.25, 0.5, 0.75, 1]
const chartGridRows = gridSteps.map(step => ({
  step,
  y: chartPadding.top + plotHeight - step * plotHeight,
}))
const donutRadius = 52
const donutCircumference = 2 * Math.PI * donutRadius
const adminDashOffset = donutCircumference * (1 - adminShare)

const formatMoney = (value: number) => moneyFormatter.format(value)

const formatCompactMoney = (value: number) => {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(value >= 100000 ? 2 : 1)}万`
  }

  return formatMoney(value)
}

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

const formatDateLabel = (value: string) => {
  const [, month, day] = value.split('-')
  return `${month}.${day}`
}

const formatDateHeadline = (value: string) => {
  const [, month, day] = value.split('-')
  return `${month}月${day}日`
}

const rangeLabel = `${formatDateHeadline(rows[0]?.sumDate ?? '')} - ${formatDateHeadline(rows[rows.length - 1]?.sumDate ?? '')}`

const kpiCards = [
  {
    label: '窗口成交额',
    value: formatCompactMoney(totalAmount),
    detail: `总金额 ${formatMoney(totalAmount)}`,
  },
  {
    label: '成交笔数',
    value: integerFormatter.format(totalOrders),
    detail: `活跃交易日 ${activeDays} 天`,
  },
  {
    label: '渠道结构',
    value: formatPercent(adminShare),
    detail: '后台代客下单占比',
  },
  {
    label: '笔均成交',
    value: formatCompactMoney(orderAverage),
    detail: `活跃日均 ${formatCompactMoney(activeDayAverage)}`,
  },
]

const insightCards = [
  {
    title: '启动前半段静默明显',
    text: `前 ${inactiveDays} 天未产生订单，交易在 03 月 23 日后才进入有效启动阶段，说明活动或客户需求集中释放。`,
  },
  {
    title: '03 月 24 日单点爆发',
    text: `${formatDateHeadline(peakRow.sumDate)} 贡献 ${formatPercent(peakShare)} 的窗口成交额，金额达到 ${formatMoney(peakRow.allAmount)}，需要结合大客户或集中采购场景复盘来源。`,
  },
  {
    title: '退货风险暂未出现',
    text: `退货笔数与退货金额均为 0，当前净额与订单额完全一致，短期内销售质量表现稳定。`,
  },
]

const timelineRows = rows.map(row => {
  const notes = []

  if (row.allAmount === 0) {
    notes.push('静默')
  }
  if (row.sumDate === peakRow.sumDate) {
    notes.push('峰值')
  }
  if (row.selfOrderTotal > 0 && row.adminOrderTotal > 0) {
    notes.push('双通路')
  } else if (row.selfOrderTotal > 0) {
    notes.push('自主下单')
  } else if (row.adminOrderTotal > 0) {
    notes.push('后台代下单')
  }

  return {
    ...row,
    label: formatDateLabel(row.sumDate),
    amountRatio: maxAmount > 0 ? row.allAmount / maxAmount : 0,
    notes: notes.join(' / ') || '无波动',
  }
})

const reportData1Styles = `
.report-data1-scope.report-page {
  --rp: var(--color-primary);
  --rp-c: var(--color-primary-content);
  --rs: var(--color-secondary);
  --rs-c: var(--color-secondary-content);
  --ra: var(--color-accent);
  --ra-c: var(--color-accent-content);
  --r-base: var(--color-base-100);
  --r-base2: var(--color-base-200);
  --r-base3: var(--color-base-300);
  --r-content: var(--color-base-content);
  --r-neutral: var(--color-neutral);
  --r-neutral-c: var(--color-neutral-content);

  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0 24px;
}

@media (min-width: 768px) {
  .report-data1-scope.report-page {
    padding: 0 32px;
  }
}

@media (min-width: 1280px) {
  .report-data1-scope.report-page {
    padding: 0 48px;
  }
}

.report-data1-scope .report-card {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid color-mix(in oklch, var(--r-base3) 60%, transparent);
  background:
    radial-gradient(ellipse 60% 50% at 95% -10%, color-mix(in oklch, var(--rp) 14%, transparent), transparent),
    radial-gradient(ellipse 40% 60% at 5% 110%, color-mix(in oklch, var(--rs) 10%, transparent), transparent),
    color-mix(in oklch, var(--r-base2) 55%, var(--r-base));
  box-shadow:
    0 4px 24px color-mix(in oklch, var(--r-base3) 30%, transparent),
    0 20px 60px -12px color-mix(in oklch, var(--r-base3) 40%, transparent);
  backdrop-filter: blur(2px);
  transition: box-shadow 0.4s ease, transform 0.4s ease;
}

.report-data1-scope .report-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--rp) 30%, transparent) 0%,
    transparent 40%,
    transparent 60%,
    color-mix(in oklch, var(--ra) 20%, transparent) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.6;
  transition: opacity 0.4s ease;
}

.report-data1-scope .report-card:hover::before {
  opacity: 1;
}

.report-data1-scope .report-card:hover {
  box-shadow:
    0 4px 32px color-mix(in oklch, var(--rp) 12%, transparent),
    0 24px 80px -12px color-mix(in oklch, var(--r-base3) 40%, transparent);
  transform: translateY(-2px);
}

.report-data1-scope .report-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.8fr);
  gap: 24px;
  padding: 36px;
}

.report-data1-scope .report-kicker,
.report-data1-scope .report-panel-eyebrow {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rp);
}

.report-data1-scope .report-hero-copy h1,
.report-data1-scope .report-panel-header h2,
.report-data1-scope .report-kpi-card h2,
.report-data1-scope .report-insight-item h3 {
  margin: 0;
}

.report-data1-scope .report-hero-copy h1 {
  max-width: 18ch;
  font-size: clamp(32px, 5vw, 58px);
  line-height: 1.05;
  color: var(--r-content);
  letter-spacing: -0.02em;
}

.report-data1-scope .report-hero-text,
.report-data1-scope .report-board-copy,
.report-data1-scope .report-panel-summary,
.report-data1-scope .report-channel-item p,
.report-data1-scope .report-insight-item p,
.report-data1-scope .report-timeline-main span,
.report-data1-scope .report-timeline-metrics span,
.report-data1-scope .report-kpi-card span {
  color: color-mix(in oklch, var(--r-content) 68%, transparent);
  line-height: 1.75;
}

.report-data1-scope .report-hero-text {
  max-width: 68ch;
  margin: 18px 0 0;
}

.report-data1-scope .report-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.report-data1-scope .report-tag {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--rp) 28%, transparent);
  background: color-mix(in oklch, var(--rp) 12%, transparent);
  color: var(--rp);
  font-size: 13px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.report-data1-scope .report-tag:hover {
  background: color-mix(in oklch, var(--rp) 22%, transparent);
  border-color: color-mix(in oklch, var(--rp) 45%, transparent);
  transform: translateY(-1px);
}

.report-data1-scope .report-hero-board {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border-radius: 24px;
  background:
    radial-gradient(ellipse 80% 50% at 20% 5%, color-mix(in oklch, var(--rp) 18%, transparent), transparent),
    color-mix(in oklch, var(--r-base3) 60%, var(--r-base2));
  border: 1px solid color-mix(in oklch, var(--r-base3) 60%, transparent);
  box-shadow: 0 8px 32px color-mix(in oklch, var(--r-base3) 40%, transparent);
}

.report-data1-scope .report-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.report-data1-scope .report-board-label,
.report-data1-scope .report-board-date {
  font-size: 13px;
  font-weight: 700;
}

.report-data1-scope .report-board-label {
  color: color-mix(in oklch, var(--r-content) 55%, transparent);
}

.report-data1-scope .report-board-date {
  color: var(--rp);
}

.report-data1-scope .report-board-value {
  font-size: clamp(36px, 4vw, 52px);
  font-weight: 800;
  line-height: 1;
  color: var(--r-content);
  background: linear-gradient(135deg, var(--r-content) 30%, var(--rp));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.report-data1-scope .report-board-copy {
  margin: 0;
}

.report-data1-scope .report-sparkline {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  align-items: end;
  gap: 10px;
  min-height: 140px;
}

.report-data1-scope .report-spark-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-height: 140px;
}

.report-data1-scope .report-spark-bar {
  width: 100%;
  min-height: 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, color-mix(in oklch, var(--rp) 85%, var(--ra)), color-mix(in oklch, var(--rp) 30%, transparent));
  box-shadow: 0 10px 25px color-mix(in oklch, var(--rp) 22%, transparent);
  transition: all 0.3s ease;
}

.report-data1-scope .report-spark-bar:hover {
  box-shadow: 0 10px 32px color-mix(in oklch, var(--rp) 38%, transparent);
  transform: scaleX(1.1);
}

.report-data1-scope .report-spark-bar.is-peak {
  background: linear-gradient(180deg, color-mix(in oklch, var(--rs) 90%, var(--rp)), color-mix(in oklch, var(--rp) 30%, transparent));
  box-shadow: 0 10px 28px color-mix(in oklch, var(--rs) 32%, transparent);
}

.report-data1-scope .report-spark-label,
.report-data1-scope .report-axis-label,
.report-data1-scope .report-grid-label {
  font-size: 11px;
  fill: color-mix(in oklch, var(--r-content) 50%, transparent);
  color: color-mix(in oklch, var(--r-content) 50%, transparent);
}

.report-data1-scope .report-kpi-grid,
.report-data1-scope .report-panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.report-data1-scope .report-panel-grid-primary {
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
}

.report-data1-scope .report-kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.report-data1-scope .report-kpi-card {
  padding: 22px 22px 20px;
}

.report-data1-scope .report-kpi-card p {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rp);
}

.report-data1-scope .report-kpi-card h2 {
  margin-top: 16px;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1;
  color: var(--r-content);
}

.report-data1-scope .report-kpi-card span {
  display: block;
  margin-top: 12px;
}

.report-data1-scope .report-chart-card,
.report-data1-scope .report-channel-card,
.report-data1-scope .report-insight-card,
.report-data1-scope .report-timeline-card {
  padding: 24px;
}

.report-data1-scope .report-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.report-data1-scope .report-panel-header h2 {
  font-size: 28px;
  color: var(--r-content);
}

.report-data1-scope .report-panel-summary {
  max-width: 28ch;
  font-size: 14px;
}

.report-data1-scope .report-chart-shell {
  overflow: hidden;
  border-radius: 24px;
  background: color-mix(in oklch, var(--r-base3) 50%, var(--r-base2));
  border: 1px solid color-mix(in oklch, var(--r-base3) 50%, transparent);
  box-shadow: inset 0 2px 12px color-mix(in oklch, var(--r-base3) 30%, transparent);
}

.report-data1-scope .report-svg-chart {
  display: block;
  width: 100%;
  height: auto;
}

.report-data1-scope .report-grid-line {
  stroke: color-mix(in oklch, var(--r-content) 10%, transparent);
  stroke-width: 1;
  stroke-dasharray: 4 8;
}

.report-data1-scope .report-line-path {
  fill: none;
  stroke-width: 4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.report-data1-scope .report-point-outer {
  fill: var(--r-base2);
  stroke: color-mix(in oklch, var(--rp) 80%, var(--r-content));
  stroke-width: 2;
  transition: r 0.3s ease;
}

.report-data1-scope .report-point-inner {
  fill: var(--rp);
}

.report-data1-scope .report-channel-body {
  position: relative;
  display: grid;
  place-items: center;
  padding: 10px 0 20px;
}

.report-data1-scope .report-donut {
  width: min(100%, 220px);
  height: auto;
}

.report-data1-scope .report-donut-track,
.report-data1-scope .report-donut-admin,
.report-data1-scope .report-donut-self {
  fill: none;
  stroke-width: 16;
  transform: rotate(-90deg);
  transform-origin: 80px 80px;
  stroke-linecap: round;
}

.report-data1-scope .report-donut-track {
  stroke: color-mix(in oklch, var(--r-content) 10%, transparent);
}

.report-data1-scope .report-donut-admin {
  stroke: var(--rp);
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--rp) 40%, transparent));
}

.report-data1-scope .report-donut-self {
  stroke: var(--ra);
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--ra) 40%, transparent));
}

.report-data1-scope .report-channel-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
}

.report-data1-scope .report-channel-center strong {
  font-size: 32px;
  color: var(--r-content);
}

.report-data1-scope .report-channel-center span {
  font-size: 13px;
  color: color-mix(in oklch, var(--r-content) 60%, transparent);
}

.report-data1-scope .report-channel-list {
  display: grid;
  gap: 14px;
}

.report-data1-scope .report-channel-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in oklch, var(--r-base2) 30%, var(--r-base));
  border: 1px solid color-mix(in oklch, var(--r-base3) 30%, transparent);
  transition: all 0.3s ease;
}

.report-data1-scope .report-channel-item:hover {
  background: color-mix(in oklch, var(--r-base2) 50%, var(--r-base));
  border-color: color-mix(in oklch, var(--r-base3) 50%, transparent);
  transform: translateX(4px);
}

.report-data1-scope .report-channel-item strong,
.report-data1-scope .report-timeline-main strong,
.report-data1-scope .report-timeline-metrics strong {
  display: block;
  color: var(--r-content);
}

.report-data1-scope .report-channel-item p {
  margin: 4px 0 0;
  font-size: 13px;
}

.report-data1-scope .report-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.report-data1-scope .report-dot-admin {
  background: var(--rp);
  box-shadow: 0 0 18px color-mix(in oklch, var(--rp) 42%, transparent);
}

.report-data1-scope .report-dot-self {
  background: var(--ra);
  box-shadow: 0 0 18px color-mix(in oklch, var(--ra) 42%, transparent);
}

.report-data1-scope .report-bars {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 14px;
  align-items: end;
  min-height: 280px;
  padding: 18px;
  border-radius: 24px;
  background: color-mix(in oklch, var(--r-base3) 40%, var(--r-base2));
  border: 1px solid color-mix(in oklch, var(--r-base3) 45%, transparent);
  box-shadow: inset 0 2px 12px color-mix(in oklch, var(--r-base3) 25%, transparent);
}

.report-data1-scope .report-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-height: 244px;
}

.report-data1-scope .report-bar-shell {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 180px;
  padding: 0 4px;
}

.report-data1-scope .report-bar-fill {
  width: 100%;
  min-height: 8px;
  border-radius: 18px 18px 6px 6px;
  background: linear-gradient(180deg, color-mix(in oklch, var(--ra) 80%, var(--rs)), color-mix(in oklch, var(--ra) 18%, transparent));
  box-shadow: 0 4px 16px color-mix(in oklch, var(--ra) 18%, transparent);
  transition: all 0.3s ease;
}

.report-data1-scope .report-bar-fill:hover {
  box-shadow: 0 6px 24px color-mix(in oklch, var(--ra) 30%, transparent);
  filter: brightness(1.1);
}

.report-data1-scope .report-bar-fill.is-accent {
  background: linear-gradient(180deg, color-mix(in oklch, var(--rp) 80%, var(--ra)), color-mix(in oklch, var(--rp) 18%, transparent));
  box-shadow: 0 4px 16px color-mix(in oklch, var(--rp) 18%, transparent);
}

.report-data1-scope .report-bar-fill.is-accent:hover {
  box-shadow: 0 6px 24px color-mix(in oklch, var(--rp) 30%, transparent);
}

.report-data1-scope .report-bar-group strong {
  font-size: 18px;
  color: var(--r-content);
}

.report-data1-scope .report-bar-group span {
  color: color-mix(in oklch, var(--r-content) 55%, transparent);
  font-size: 12px;
}

.report-data1-scope .report-insight-list {
  display: grid;
  gap: 14px;
}

.report-data1-scope .report-insight-item {
  padding: 18px 18px 16px;
  border-radius: 22px;
  background: color-mix(in oklch, var(--r-base2) 30%, var(--r-base));
  border: 1px solid color-mix(in oklch, var(--r-base3) 30%, transparent);
  border-left: 3px solid color-mix(in oklch, var(--rp) 50%, var(--rs));
  transition: all 0.3s ease;
}

.report-data1-scope .report-insight-item:hover {
  background: color-mix(in oklch, var(--r-base2) 50%, var(--r-base));
  border-left-color: var(--rp);
  transform: translateX(4px);
}

.report-data1-scope .report-insight-item h3 {
  margin-bottom: 8px;
  font-size: 18px;
  color: var(--r-content);
}

.report-data1-scope .report-insight-item p {
  margin: 0;
}

.report-data1-scope .report-timeline-list {
  display: grid;
  gap: 12px;
}

.report-data1-scope .report-timeline-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.3fr) minmax(0, 1fr) minmax(220px, 0.55fr);
  gap: 18px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 22px;
  background: color-mix(in oklch, var(--r-base2) 25%, var(--r-base));
  border: 1px solid color-mix(in oklch, var(--r-base3) 25%, transparent);
  transition: all 0.3s ease;
}

.report-data1-scope .report-timeline-row:hover {
  background: color-mix(in oklch, var(--r-base2) 45%, var(--r-base));
  transform: translateX(4px);
}

.report-data1-scope .report-timeline-main span,
.report-data1-scope .report-timeline-metrics span {
  display: block;
  margin-top: 4px;
  font-size: 13px;
}

.report-data1-scope .report-timeline-track {
  position: relative;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in oklch, var(--r-content) 10%, transparent);
}

.report-data1-scope .report-timeline-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--rs), var(--ra));
  box-shadow: 0 0 12px color-mix(in oklch, var(--rp) 20%, transparent);
  transition: filter 0.3s ease;
}

.report-data1-scope .report-timeline-row:hover .report-timeline-fill {
  filter: brightness(1.15);
}

.report-data1-scope .report-stop-area-top {
  stop-color: var(--rp);
  stop-opacity: 0.45;
}

.report-data1-scope .report-stop-area-bottom {
  stop-color: var(--rp);
  stop-opacity: 0;
}

.report-data1-scope .report-stop-line-start {
  stop-color: var(--rs);
}

.report-data1-scope .report-stop-line-end {
  stop-color: var(--ra);
}

@keyframes reportData1FloatIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.report-data1-scope .report-card,
.report-data1-scope .report-kpi-card {
  animation: reportData1FloatIn 0.6s ease both;
}

.report-data1-scope .report-kpi-card:nth-child(1) { animation-delay: 0ms; }
.report-data1-scope .report-kpi-card:nth-child(2) { animation-delay: 80ms; }
.report-data1-scope .report-kpi-card:nth-child(3) { animation-delay: 160ms; }
.report-data1-scope .report-kpi-card:nth-child(4) { animation-delay: 240ms; }

.report-data1-scope .report-timeline-row:nth-child(odd) {
  border-left: 3px solid color-mix(in oklch, var(--rp) 30%, var(--rs));
}

.report-data1-scope .report-timeline-row:nth-child(even) {
  border-left: 3px solid color-mix(in oklch, var(--ra) 30%, var(--rp));
}

@media (max-width: 1100px) {
  .report-data1-scope .report-kpi-grid,
  .report-data1-scope .report-panel-grid,
  .report-data1-scope .report-panel-grid-primary,
  .report-data1-scope .report-hero {
    grid-template-columns: 1fr;
  }

  .report-data1-scope .report-panel-header {
    flex-direction: column;
  }

  .report-data1-scope .report-panel-summary {
    max-width: none;
  }

  .report-data1-scope .report-timeline-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .report-data1-scope .report-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-data1-scope .report-bars,
  .report-data1-scope .report-sparkline {
    gap: 8px;
  }
}

@media (max-width: 640px) {
  .report-data1-scope.report-page {
    padding: 0 12px;
    gap: 16px;
  }

  .report-data1-scope .report-hero,
  .report-data1-scope .report-chart-card,
  .report-data1-scope .report-channel-card,
  .report-data1-scope .report-insight-card,
  .report-data1-scope .report-timeline-card {
    padding: 20px;
  }

  .report-data1-scope .report-kpi-grid {
    grid-template-columns: 1fr;
  }

  .report-data1-scope .report-bars,
  .report-data1-scope .report-sparkline {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .report-data1-scope .report-channel-item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .report-data1-scope .report-channel-item > span:last-child {
    grid-column: 2;
  }
}
`

const ReportData1: FC = () => (
  <>
    <style>{reportData1Styles}</style>
    <div className="report-data1-scope report-page">
      <section className="report-hero report-card">
        <div className="report-hero-copy">
          <p className="report-kicker">Data Pulse / March 2026</p>
          <h1>10 日经营数据从静默切换到集中爆发，峰值日几乎决定整段窗口表现。</h1>
          <p className="report-hero-text">
            统计区间为 {rangeLabel}。窗口总成交额达到 {formatMoney(totalAmount)}，共形成{' '}
            {integerFormatter.format(totalOrders)} 笔订单， 其中{' '}
            {formatDateHeadline(peakRow.sumDate)} 单日贡献 {formatPercent(peakShare)}
            ，而退货金额维持在 {formatMoney(totalReturnsAmount)}。
          </p>
          <div className="report-hero-tags">
            <span className="report-tag">{inactiveDays} 天静默期</span>
            <span className="report-tag">{activeDays} 天有效成交</span>
            <span className="report-tag">
              客户记录 {integerFormatter.format(totalClientRecords)}
            </span>
          </div>
        </div>

        <div className="report-hero-board">
          <div className="report-board-header">
            <span className="report-board-label">峰值日</span>
            <span className="report-board-date">{formatDateHeadline(peakRow.sumDate)}</span>
          </div>
          <div className="report-board-value">{formatCompactMoney(peakRow.allAmount)}</div>
          <p className="report-board-copy">
            单日完成 {integerFormatter.format(peakRow.ordersCount)} 笔订单，客户均额{' '}
            {formatCompactMoney(peakRow.avgClientPrice)}。
          </p>
          <div className="report-sparkline">
            {timelineRows.map(row => (
              <div key={row.sumDate} className="report-spark-item">
                <span
                  className={`report-spark-bar ${row.sumDate === peakRow.sumDate ? 'is-peak' : ''}`}
                  style={{ height: `${Math.max(10, row.amountRatio * 100)}%` }}
                />
                <span className="report-spark-label">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="report-kpi-grid">
        {kpiCards.map(card => (
          <article key={card.label} className="report-kpi-card report-card">
            <p>{card.label}</p>
            <h2>{card.value}</h2>
            <span>{card.detail}</span>
          </article>
        ))}
      </section>

      <section className="report-panel-grid report-panel-grid-primary">
        <article className="report-card report-chart-card report-chart-wide">
          <div className="report-panel-header">
            <div>
              <p className="report-panel-eyebrow">GMV Trend</p>
              <h2>成交金额波动</h2>
            </div>
            <div className="report-panel-summary">
              03.24 抬升整段曲线，后续三天维持正向成交尾流。
            </div>
          </div>

          <div className="report-chart-shell">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="report-svg-chart"
              role="img"
              aria-label="每日成交金额趋势图"
            >
              <defs>
                <linearGradient id="reportAreaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" className="report-stop-area-top" />
                  <stop offset="100%" className="report-stop-area-bottom" />
                </linearGradient>
                <linearGradient id="reportLineGradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" className="report-stop-line-start" />
                  <stop offset="100%" className="report-stop-line-end" />
                </linearGradient>
              </defs>

              {chartGridRows.map(gridRow => (
                <g key={gridRow.step}>
                  <line
                    x1={chartPadding.left}
                    y1={gridRow.y}
                    x2={chartWidth - chartPadding.right}
                    y2={gridRow.y}
                    className="report-grid-line"
                  />
                  <text x={chartPadding.left + 6} y={gridRow.y - 8} className="report-grid-label">
                    {formatCompactMoney(maxAmount * gridRow.step)}
                  </text>
                </g>
              ))}

              <path d={areaPath} fill="url(#reportAreaGradient)" />
              <path d={amountPath} className="report-line-path" stroke="url(#reportLineGradient)" />

              {amountPoints.map(point => (
                <g key={point.row.sumDate}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.row.sumDate === peakRow.sumDate ? 7 : 4.5}
                    className="report-point-outer"
                  />
                  <circle cx={point.x} cy={point.y} r={3.2} className="report-point-inner" />
                  <text
                    x={point.x}
                    y={chartHeight - 12}
                    text-anchor="middle"
                    className="report-axis-label"
                  >
                    {formatDateLabel(point.row.sumDate)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </article>

        <article className="report-card report-channel-card">
          <div className="report-panel-header">
            <div>
              <p className="report-panel-eyebrow">Channel Mix</p>
              <h2>下单渠道分布</h2>
            </div>
          </div>

          <div className="report-channel-body">
            <svg
              viewBox="0 0 160 160"
              className="report-donut"
              role="img"
              aria-label="下单渠道占比图"
            >
              <circle cx="80" cy="80" r={donutRadius} className="report-donut-track" />
              <circle
                cx="80"
                cy="80"
                r={donutRadius}
                className="report-donut-admin"
                stroke-dasharray={`${donutCircumference}`}
                stroke-dashoffset="0"
              />
              <circle
                cx="80"
                cy="80"
                r={donutRadius}
                className="report-donut-self"
                stroke-dasharray={`${donutCircumference * selfShare} ${donutCircumference}`}
                stroke-dashoffset={-adminDashOffset}
              />
            </svg>

            <div className="report-channel-center">
              <strong>{formatPercent(adminShare)}</strong>
              <span>后台代客</span>
            </div>
          </div>

          <div className="report-channel-list">
            <div className="report-channel-item">
              <span className="report-dot report-dot-admin" />
              <div>
                <strong>后台代客下单</strong>
                <p>{formatMoney(totalAdminAmount)}</p>
              </div>
              <span>{formatPercent(adminShare)}</span>
            </div>
            <div className="report-channel-item">
              <span className="report-dot report-dot-self" />
              <div>
                <strong>客户自主下单</strong>
                <p>{formatMoney(totalSelfAmount)}</p>
              </div>
              <span>{formatPercent(selfShare)}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="report-panel-grid">
        <article className="report-card report-chart-card">
          <div className="report-panel-header">
            <div>
              <p className="report-panel-eyebrow">Order Volume</p>
              <h2>每日订单笔数</h2>
            </div>
            <div className="report-panel-summary">
              尾段交易频次持续升高，03.27 以 8 笔达到订单数峰值。
            </div>
          </div>

          <div className="report-bars">
            {rows.map(row => (
              <div key={row.sumDate} className="report-bar-group">
                <div className="report-bar-shell">
                  <div
                    className={`report-bar-fill ${row.sumDate === peakRow.sumDate ? 'is-accent' : ''}`}
                    style={{ height: `${Math.max(8, (row.ordersCount / maxOrders) * 100)}%` }}
                  />
                </div>
                <strong>{integerFormatter.format(row.ordersCount)}</strong>
                <span>{formatDateLabel(row.sumDate)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="report-card report-insight-card">
          <div className="report-panel-header">
            <div>
              <p className="report-panel-eyebrow">Signals</p>
              <h2>关键观察</h2>
            </div>
          </div>

          <div className="report-insight-list">
            {insightCards.map(item => (
              <article key={item.title} className="report-insight-item">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="report-card report-timeline-card">
        <div className="report-panel-header">
          <div>
            <p className="report-panel-eyebrow">Daily Playback</p>
            <h2>逐日回放</h2>
          </div>
          <div className="report-panel-summary">
            按金额强度缩放，便于观察 10 天窗口内的启动、放量与回落节奏。
          </div>
        </div>

        <div className="report-timeline-list">
          {timelineRows.map(row => (
            <div key={row.sumDate} className="report-timeline-row">
              <div className="report-timeline-main">
                <strong>{row.label}</strong>
                <span>{row.notes}</span>
              </div>
              <div className="report-timeline-track">
                <span
                  className="report-timeline-fill"
                  style={{ width: `${Math.max(4, row.amountRatio * 100)}%` }}
                />
              </div>
              <div className="report-timeline-metrics">
                <strong>{formatCompactMoney(row.allAmount)}</strong>
                <span>
                  {integerFormatter.format(row.ordersCount)} 笔 / 客户均额{' '}
                  {formatCompactMoney(row.avgClientPrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  </>
)

export default ReportData1
