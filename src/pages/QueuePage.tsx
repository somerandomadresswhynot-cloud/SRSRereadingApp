import { useMemo, useState } from 'react';
import { ReviewPanel } from '../components/ReviewPanel';
import { formatDate } from '../lib/date';
import { buildProjection, dueState, pickRecommendation } from '../lib/scheduler';
import { useAppState } from '../lib/store';
import type { UnitNode } from '../lib/types';

type MetricKey = 'learningToday' | 'reviewToday' | 'avgReviewMinutes' | 'dueDistribution';
type Position = { row: number; col: number };

const center: Position = { row: 1, col: 1 };
const samePosition = (a: Position, b: Position) => a.row === b.row && a.col === b.col;

export function QueuePage() {
  const { settings, units, sources, reviews, timers, reviewUnit } = useAppState();
  const [active, setActive] = useState<UnitNode | null>(null);
  const [kpiScale, setKpiScale] = useState(1);
  const [enabledMetrics, setEnabledMetrics] = useState<Record<MetricKey, boolean>>({
    learningToday: true,
    reviewToday: true,
    avgReviewMinutes: true,
    dueDistribution: true
  });
  const [metricLayout, setMetricLayout] = useState<Record<MetricKey, Position>>({
    learningToday: { row: 1, col: 1 },
    reviewToday: { row: 0, col: 1 },
    avgReviewMinutes: { row: 1, col: 2 },
    dueDistribution: { row: 2, col: 1 }
  });

  const recommendation = useMemo(() => pickRecommendation(units, settings), [units, settings]);
  const projection = useMemo(() => buildProjection(units, settings), [units, settings]);
  const dueToday = projection[0];
  const source = sources.find((s) => s.id === (active ?? recommendation.unit)?.sourceId);

  const today = new Date().toISOString().slice(0, 10);
  const timeSpentToday = timers.filter((t) => t.createdAt === today).reduce((acc, t) => acc + t.minutesSpent, 0);
  const reviewsToday = reviews.filter((r) => r.reviewedAt === today);
  const avgReviewMinutes = reviewsToday.length ? Math.round(reviewsToday.reduce((acc, r) => acc + (r.durationMinutes ?? 0), 0) / reviewsToday.length) : 0;
  const dueDistribution = {
    overdue: units.filter((u) => u.isLeaf && dueState(u) === 'overdue').length,
    due: units.filter((u) => u.isLeaf && dueState(u) === 'due').length,
    new: units.filter((u) => u.isLeaf && dueState(u) === 'new').length
  };

  const metricDefinitions: Record<MetricKey, { label: string; content: string }> = {
    learningToday: { label: 'Time spent today', content: `${timeSpentToday} min` },
    reviewToday: { label: 'Reviews today', content: `${reviewsToday.length}` },
    avgReviewMinutes: { label: 'Avg review duration', content: `${avgReviewMinutes} min` },
    dueDistribution: { label: 'Due distribution', content: `overdue ${dueDistribution.overdue} · due ${dueDistribution.due} · new ${dueDistribution.new}` }
  };

  const moveMetric = (key: MetricKey, deltaRow: number, deltaCol: number) => {
    const current = metricLayout[key];
    const next = { row: current.row + deltaRow, col: current.col + deltaCol };
    if (next.row < 0 || next.row > 2 || next.col < 0 || next.col > 2) return;

    const swappedKey = (Object.keys(metricLayout) as MetricKey[]).find((candidate) => candidate !== key && samePosition(metricLayout[candidate], next));
    const centerMetric = (Object.keys(metricLayout) as MetricKey[]).find((candidate) => samePosition(metricLayout[candidate], center));

    setMetricLayout((prev) => {
      const updated = { ...prev, [key]: next };
      if (swappedKey) updated[swappedKey] = current;

      const updatedCenterMetric = (Object.keys(updated) as MetricKey[]).find((candidate) => samePosition(updated[candidate], center));
      if (updatedCenterMetric) return updated;

      const fallbackCenterMetric = centerMetric ?? key;
      const displaced = (Object.keys(updated) as MetricKey[]).find((candidate) => candidate !== fallbackCenterMetric && samePosition(updated[candidate], center));
      updated[fallbackCenterMetric] = center;
      if (displaced && displaced !== fallbackCenterMetric) {
        updated[displaced] = current;
      }
      return updated;
    });
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>Next recommended unit</h2>
        {recommendation.unit && <>
          <h3>{recommendation.unit.title}</h3>
          <p className="muted">{sources.find((s) => s.id === recommendation.unit.sourceId)?.title} · {recommendation.unit.path}</p>
          <p><strong>Due state:</strong> {dueState(recommendation.unit)} · {formatDate(recommendation.unit.dueAt) ?? 'new'}</p>
          <p><strong>Estimated:</strong> {recommendation.unit.estimatedMinutes} min · {recommendation.unit.estimatedPages} pages · {recommendation.unit.locationLabel}</p>
          <p className="muted">Why this is next: {recommendation.reason}</p>
          <div className="row"><button className="btn" onClick={() => setActive(recommendation.unit)}>Open unit</button><button className="ghost" onClick={() => setActive(units.find((u) => u.isLeaf && u.id !== recommendation.unit?.id) ?? null)}>See alternatives</button></div>
        </>}
      </section>

      <section className="card stats-row">
        <div><h4>Today</h4><p>{dueToday?.dueCount ?? 0} due units</p></div>
        <div><h4>Review min</h4><p>{dueToday?.minutes ?? 0} min</p></div>
        <div><h4>Pages</h4><p>{dueToday?.pages ?? 0} pages</p></div>
        <div><h4>New items</h4><p>{recommendation.allowNew ? 'Allowed' : 'Held back'}</p></div>
      </section>

      <section className="card kpi-tile" style={{ transform: `scale(${kpiScale})`, transformOrigin: 'top left' }}>
        <div className="row spread"><h3>Basic KPIs</h3><label>Scale<input type="range" min="0.8" max="1.4" step="0.1" value={kpiScale} onChange={(e) => setKpiScale(Number(e.target.value))} /></label></div>
        <div className="row">{(Object.keys(enabledMetrics) as MetricKey[]).map((key) => <label key={key}><input type="checkbox" checked={enabledMetrics[key]} onChange={(e) => setEnabledMetrics((m) => ({ ...m, [key]: e.target.checked }))} /> {key}</label>)}</div>
        <p className="muted">Tiles are reorderable in both directions. Center is always occupied.</p>
        <div className="kpi-grid">
          {(Object.keys(metricDefinitions) as MetricKey[]).filter((key) => enabledMetrics[key]).map((key) => {
            const metric = metricDefinitions[key];
            const pos = metricLayout[key];
            return (
              <article
                key={key}
                className="mini-card kpi-card"
                style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
              >
                <h4>{metric.label}</h4>
                <p>{metric.content}</p>
                <div className="row">
                  <button className="ghost" onClick={() => moveMetric(key, -1, 0)}>↑</button>
                  <button className="ghost" onClick={() => moveMetric(key, 1, 0)}>↓</button>
                  <button className="ghost" onClick={() => moveMetric(key, 0, -1)}>←</button>
                  <button className="ghost" onClick={() => moveMetric(key, 0, 1)}>→</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3>Projected load</h3>
        <div className="strip">{projection.map((p) => <div key={p.dayIndex} className="mini-card"><strong>{p.label}</strong><span>{p.dueCount} units</span><span>{p.minutes} min</span><span>{p.pages} pages</span></div>)}</div>
      </section>

      {active && source && <ReviewPanel unit={active} source={source} onSubmit={async (rating, recall, reviewedAt, durationMinutes) => { await reviewUnit(active.id, rating, recall, reviewedAt, durationMinutes); setActive(null); }} />}
    </div>
  );
}
