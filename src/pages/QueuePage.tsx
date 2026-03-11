import { useEffect, useMemo, useState } from 'react';
import { ReviewPanel } from '../components/ReviewPanel';
import { TileGridEditor } from '../components/TileGridEditor';
import { formatDate } from '../lib/date';
import { buildProjection, dueState, pickRecommendation } from '../lib/scheduler';
import { defaultKpiTiles } from '../lib/layout';
import { useAppState } from '../lib/store';
import type { DashboardTileLayout, UnitNode } from '../lib/types';

type MetricKey = 'learningToday' | 'reviewToday' | 'avgReviewMinutes' | 'dueDistribution';

const centerFallbackId: MetricKey = 'learningToday';
const ensureCenterOccupied = (tiles: DashboardTileLayout[]) => {
  const centerX = 2;
  const centerY = 1;
  const visible = tiles.filter((tile) => !tile.hidden);
  const centerTile = visible.find((tile) => centerX >= tile.x && centerX < tile.x + tile.w && centerY >= tile.y && centerY < tile.y + tile.h);
  if (centerTile) return tiles;
  return tiles.map((tile) => tile.id === centerFallbackId ? { ...tile, hidden: false, x: 1, y: 1 } : tile);
};

type MetricKey = 'learningToday' | 'reviewToday' | 'avgReviewMinutes' | 'dueDistribution';
type Position = { row: number; col: number };

const center: Position = { row: 1, col: 1 };
const samePosition = (a: Position, b: Position) => a.row === b.row && a.col === b.col;

export function QueuePage() {
  const { settings, units, sources, reviews, timers, reviewUnit, updateSettings } = useAppState();
  const [active, setActive] = useState<UnitNode | null>(null);
  const [kpiScale, setKpiScale] = useState(1);
  const [tiles, setTiles] = useState<DashboardTileLayout[]>(ensureCenterOccupied(settings.kpiTiles));

  useEffect(() => {
    setTiles(ensureCenterOccupied(settings.kpiTiles));
  }, [settings.kpiTiles]);

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

  const persistTiles = async (nextTiles: DashboardTileLayout[]) => {
    const safeTiles = ensureCenterOccupied(nextTiles);
    setTiles(safeTiles);
    await updateSettings({ ...settings, kpiTiles: safeTiles });
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

      <section className="card" style={{ transform: `scale(${kpiScale})`, transformOrigin: 'top left' }}>
        <div className="row spread"><h3>Basic KPIs</h3><label>Scale<input type="range" min="0.8" max="1.4" step="0.1" value={kpiScale} onChange={(e) => setKpiScale(Number(e.target.value))} /></label></div>
        <p className="muted">Drag tiles by handle, resize by edges/corner. Movement snaps to grid with threshold to avoid jitter.</p>
        <div className="row">
          {(Object.keys(metricDefinitions) as MetricKey[]).map((id) => {
            const tile = tiles.find((t) => t.id === id) ?? defaultKpiTiles.find((t: DashboardTileLayout) => t.id === id)!;
            return <label key={id}><input type="checkbox" checked={!tile.hidden} onChange={(e) => void persistTiles(tiles.map((t) => t.id === id ? { ...t, hidden: !e.target.checked } : t))} /> {id}</label>;
          })}
        </div>

        <TileGridEditor
          tiles={tiles}
          onChange={setTiles}
          onCommit={(next) => void persistTiles(next)}
          ensureCenterOccupied={ensureCenterOccupied}
          renderTile={(tile) => {
            const id = tile.id as MetricKey;
            const def = metricDefinitions[id];
            return (
              <article className="kpi-card-body">
                <div className="row spread"><h4>{def.label}</h4><button className="ghost" onClick={() => void persistTiles(tiles.map((t) => t.id === id ? { ...t, collapsed: !t.collapsed } : t))}>{tile.collapsed ? 'Expand' : 'Collapse'}</button></div>
                {!tile.collapsed && <p>{def.content}</p>}
              </article>
            );
          }}
        />
      </section>

      <section className="card">
        <h3>Projected load</h3>
        <div className="strip">{projection.map((p) => <div key={p.dayIndex} className="mini-card"><strong>{p.label}</strong><span>{p.dueCount} units</span><span>{p.minutes} min</span><span>{p.pages} pages</span></div>)}</div>
      </section>

      {active && source && <ReviewPanel unit={active} source={source} onSubmit={async (rating, recall, reviewedAt, durationMinutes) => { await reviewUnit(active.id, rating, recall, reviewedAt, durationMinutes); setActive(null); }} />}
    </div>
  );
}
