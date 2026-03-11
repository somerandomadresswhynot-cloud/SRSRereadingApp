import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TreeView } from '../components/TreeView';
import { dueState } from '../lib/scheduler';
import { useAppState } from '../lib/store';
import { ReviewPanel } from '../components/ReviewPanel';
import type { UnitNode } from '../lib/types';

export function SourcesPage() {
  const { sources, units } = useAppState();
  return (
    <div className="stack">
      <h2>Sources</h2>
      {sources.map((s) => {
        const sourceUnits = units.filter((u) => u.sourceId === s.id && u.isLeaf);
        const dueCount = sourceUnits.filter((u) => dueState(u) !== 'scheduled').length;
        const nextDue = sourceUnits.filter((u) => u.dueAt).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())[0]?.dueAt;
        return <Link key={s.id} className="card source-card" to={`/sources/${s.id}`}><strong>{s.title}</strong><span>{s.type}</span><span>{dueCount} due</span><span>{nextDue ?? 'nothing due'}</span></Link>;
      })}
    </div>
  );
}

export function SourceDetailPage() {
  const { sourceId } = useParams();
  const { sources, units, reviews, reviewUnit } = useAppState();
  const [filter, setFilter] = useState<'all' | 'due' | 'overdue' | 'new' | 'reviewed'>('all');
  const [active, setActive] = useState<UnitNode | null>(null);
  const source = sources.find((s) => s.id === sourceId);
  const sourceUnits = useMemo(() => units.filter((u) => u.sourceId === sourceId), [units, sourceId]);
  const filtered = sourceUnits.filter((u) => {
    if (!u.isLeaf) return true;
    const state = dueState(u);
    if (filter === 'all') return true;
    if (filter === 'due') return state === 'due';
    if (filter === 'overdue') return state === 'overdue';
    if (filter === 'new') return state === 'new';
    return u.reviewCount > 0;
  });

  if (!source) return <p>Source not found.</p>;

  return <div className="stack">
    <section className="card">
      <h2>{source.title}</h2>
      <p>{source.type} · total units {sourceUnits.filter((u) => u.isLeaf).length} · due {sourceUnits.filter((u) => u.isLeaf && dueState(u) !== 'scheduled').length}</p>
      <div className="row">{(['all', 'due', 'overdue', 'new', 'reviewed'] as const).map((f) => <button key={f} className={filter === f ? 'btn' : 'ghost'} onClick={() => setFilter(f)}>{f}</button>)}</div>
    </section>

    <section className="card">
      <h3>Hierarchy</h3>
      <TreeView nodes={filtered} onOpen={setActive} onHistory={setActive} />
    </section>

    <section className="card">
      <h3>Source review history</h3>
      {reviews.filter((r) => sourceUnits.some((u) => u.id === r.unitId)).slice(0, 20).map((r) => <div key={r.id} className="history-row"><span>{new Date(r.reviewedAt).toLocaleString()}</span><span>{units.find((u) => u.id === r.unitId)?.title}</span><span>{r.rating}</span><span>{r.writtenRecall.slice(0, 80) || 'No recall'}</span></div>)}
    </section>

    {active && <ReviewPanel unit={active} source={source} onSubmit={async (rating, recall) => { await reviewUnit(active.id, rating, recall); setActive(null); }} />}
  </div>;
}
