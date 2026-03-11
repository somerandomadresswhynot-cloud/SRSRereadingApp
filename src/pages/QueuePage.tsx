import { useMemo, useState } from 'react';
import { buildProjection, dueState, pickRecommendation } from '../lib/scheduler';
import { useAppState } from '../lib/store';
import { ReviewPanel } from '../components/ReviewPanel';
import type { UnitNode } from '../lib/types';

export function QueuePage() {
  const { settings, units, sources, reviewUnit } = useAppState();
  const [active, setActive] = useState<UnitNode | null>(null);
  const recommendation = useMemo(() => pickRecommendation(units, settings), [units, settings]);
  const projection = useMemo(() => buildProjection(units, settings), [units, settings]);
  const dueToday = projection[0];
  const source = sources.find((s) => s.id === (active ?? recommendation.unit)?.sourceId);

  return (
    <div className="stack">
      <section className="card">
        <h2>Next recommended unit</h2>
        {recommendation.unit && <>
          <h3>{recommendation.unit.title}</h3>
          <p className="muted">{sources.find((s) => s.id === recommendation.unit.sourceId)?.title} · {recommendation.unit.path}</p>
          <p><strong>Due state:</strong> {dueState(recommendation.unit)} · {recommendation.unit.dueAt ?? 'new'}</p>
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

      <section className="card">
        <h3>Projected load</h3>
        <div className="strip">{projection.map((p) => <div key={p.dayIndex} className="mini-card"><strong>{p.label}</strong><span>{p.dueCount} units</span><span>{p.minutes} min</span><span>{p.pages} pages</span></div>)}</div>
      </section>

      {active && source && <ReviewPanel unit={active} source={source} onSubmit={async (rating, recall) => { await reviewUnit(active.id, rating, recall); setActive(null); }} />}
    </div>
  );
}
