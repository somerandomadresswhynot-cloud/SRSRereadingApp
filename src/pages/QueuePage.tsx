import { useEffect, useMemo, useState } from 'react';
import { ReviewPanel } from '../components/ReviewPanel';
import { TileGridEditor } from '../components/TileGridEditor';
import { defaultKpiTiles, defaultQueueTiles } from '../lib/layout';
import { formatDate } from '../lib/date';
import { buildProjection, dueState, pickRecommendation } from '../lib/scheduler';
import { defaultKpiTiles } from '../lib/layout';
import { useAppState } from '../lib/store';
import type { DashboardTileLayout, UnitNode } from '../lib/types';

type MetricKey = 'learningToday' | 'reviewToday' | 'avgReviewMinutes' | 'dueDistribution';
type QueueTileKey = 'nextRecommended' | 'summary' | 'basicKpis' | 'projectedLoad';

const centerFallbackId: MetricKey = 'learningToday';
const ensureCenterOccupied = (tiles: DashboardTileLayout[]) => {
  const centerX = 2;
  const centerY = 1;
  const visible = tiles.filter((tile) => !tile.hidden);
  const centerTile = visible.find((tile) => centerX >= tile.x && centerX < tile.x + tile.w && centerY >= tile.y && centerY < tile.y + tile.h);
  if (centerTile) return tiles;
  return tiles.map((tile) => tile.id === centerFallbackId ? { ...tile, hidden: false, x: 1, y: 1 } : tile);
};

export function QueuePage() {
  const { settings, units, sources, reviews, timers, reviewUnit, updateSettings } = useAppState();
  const [active, setActive] = useState<UnitNode | null>(null);
  const [kpiScale, setKpiScale] = useState(1);
  const [queueTiles, setQueueTiles] = useState<DashboardTileLayout[]>(settings.queueTiles);
  const [kpiTiles, setKpiTiles] = useState<DashboardTileLayout[]>(ensureCenterOccupied(settings.kpiTiles));

  useEffect(() => {
    setQueueTiles(settings.queueTiles);
    setKpiTiles(ensureCenterOccupied(settings.kpiTiles));
  }, [settings.queueTiles, settings.kpiTiles]);

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

  const persistQueueTiles = async (nextTiles: DashboardTileLayout[]) => {
    setQueueTiles(nextTiles);
    await updateSettings({ ...settings, queueTiles: nextTiles, kpiTiles });
  };

  const persistKpiTiles = async (nextTiles: DashboardTileLayout[]) => {
    const safeTiles = ensureCenterOccupied(nextTiles);
    setKpiTiles(safeTiles);
    await updateSettings({ ...settings, queueTiles, kpiTiles: safeTiles });
  };

  const tileTitles: Record<QueueTileKey, string> = {
    nextRecommended: 'Next recommended unit',
    summary: 'Daily summary',
    basicKpis: 'Basic KPIs',
    projectedLoad: 'Projected load'
  };

  return (
    <div className="stack">
      <TileGridEditor
        tiles={queueTiles}
        onChange={setQueueTiles}
        onCommit={(next) => void persistQueueTiles(next)}
        renderTile={(tile) => {
          const id = tile.id as QueueTileKey;

          if (id === 'nextRecommended') {
            return <div>
              <h3>{tileTitles[id]}</h3>
              {recommendation.unit && <>
                <h4>{recommendation.unit.title}</h4>
                <p className="muted">{sources.find((s) => s.id === recommendation.unit.sourceId)?.title} · {recommendation.unit.path}</p>
                <p><strong>Due state:</strong> {dueState(recommendation.unit)} · {formatDate(recommendation.unit.dueAt) ?? 'new'}</p>
                <p><strong>Estimated:</strong> {recommendation.unit.estimatedMinutes} min · {recommendation.unit.estimatedPages} pages · {recommendation.unit.locationLabel}</p>
                <p className="muted">Why this is next: {recommendation.reason}</p>
                <div className="row"><button className="btn" onClick={() => setActive(recommendation.unit)}>Open unit</button><button className="ghost" onClick={() => setActive(units.find((u) => u.isLeaf && u.id !== recommendation.unit?.id) ?? null)}>See alternatives</button></div>
              </>}
            </div>;
          }

          if (id === 'summary') {
            return <div>
              <h3>{tileTitles[id]}</h3>
              <div className="stats-row">
                <div><h4>Today</h4><p>{dueToday?.dueCount ?? 0} due units</p></div>
                <div><h4>Review min</h4><p>{dueToday?.minutes ?? 0} min</p></div>
                <div><h4>Pages</h4><p>{dueToday?.pages ?? 0} pages</p></div>
                <div><h4>New items</h4><p>{recommendation.allowNew ? 'Allowed' : 'Held back'}</p></div>
              </div>
            </div>;
          }

          if (id === 'basicKpis') {
            return <div style={{ transform: `scale(${kpiScale})`, transformOrigin: 'top left' }}>
              <div className="row spread"><h3>{tileTitles[id]}</h3><label>Scale<input type="range" min="0.8" max="1.4" step="0.1" value={kpiScale} onChange={(e) => setKpiScale(Number(e.target.value))} /></label></div>
              <p className="muted">Drag by grip, resize from edges/corner. Snaps to grid with threshold/dead-zone.</p>
              <div className="row">
                {(Object.keys(metricDefinitions) as MetricKey[]).map((metricId) => {
                  const tileDef = kpiTiles.find((t) => t.id === metricId) ?? defaultKpiTiles.find((t) => t.id === metricId)!;
                  return <label key={metricId}><input type="checkbox" checked={!tileDef.hidden} onChange={(e) => void persistKpiTiles(kpiTiles.map((t) => t.id === metricId ? { ...t, hidden: !e.target.checked } : t))} /> {metricId}</label>;
                })}
              </div>

              <TileGridEditor
                tiles={kpiTiles}
                onChange={setKpiTiles}
                onCommit={(next) => void persistKpiTiles(next)}
                ensureCenterOccupied={ensureCenterOccupied}
                renderTile={(kpiTile) => {
                  const metricId = kpiTile.id as MetricKey;
                  const def = metricDefinitions[metricId];
                  return (
                    <article className="kpi-card-body">
                      <div className="row spread"><h4>{def.label}</h4><button className="ghost" onClick={() => void persistKpiTiles(kpiTiles.map((t) => t.id === metricId ? { ...t, collapsed: !t.collapsed } : t))}>{kpiTile.collapsed ? 'Expand' : 'Collapse'}</button></div>
                      {!kpiTile.collapsed && <p>{def.content}</p>}
                    </article>
                  );
                }}
              />
            </div>;
          }

          return <div>
            <h3>{tileTitles[id]}</h3>
            <div className="strip">{projection.map((p) => <div key={p.dayIndex} className="mini-card"><strong>{p.label}</strong><span>{p.dueCount} units</span><span>{p.minutes} min</span><span>{p.pages} pages</span></div>)}</div>
          </div>;
        }}
      />

      {active && source && <ReviewPanel unit={active} source={source} onSubmit={async (rating, recall, reviewedAt, durationMinutes) => { await reviewUnit(active.id, rating, recall, reviewedAt, durationMinutes); setActive(null); }} />}
    </div>
  );
}
