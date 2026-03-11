import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { toDateOnly } from './date';
import { db, ensureSeeded } from './db';
import { defaultKpiTiles } from './layout';
import { scheduleNext } from './scheduler';
import type { DashboardTileLayout, Rating, ReviewEvent, Settings, Source, TimerEvent, UnitNode } from './types';

interface AppState {
  sources: Source[];
  units: UnitNode[];
  reviews: ReviewEvent[];
  timers: TimerEvent[];
  settings: Settings;
  refresh: () => Promise<void>;
  reviewUnit: (unitId: string, rating: Rating, writtenRecall: string, reviewAt?: string, durationMinutes?: number) => Promise<void>;
  addSourceFromFile: (file: File) => Promise<void>;
  recordTimerEvent: (event: Omit<TimerEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

const fallbackSettings: Settings = {
  targetReviewMinutesPerDay: 35,
  targetLearningMinutesPerDay: 20,
  maxTotalMinutesPerDay: 60,
  targetRetention: 0.9,
  defaultMinutesPerPage: 1.7,
  manualReviewsAffectScheduling: true,
  allowNewItemsWhenLoadHigh: false,
  density: 'comfortable',
  kpiTiles: defaultKpiTiles
};

const normalizeSettings = (incoming?: Partial<Settings> | null): Settings => ({
  ...fallbackSettings,
  ...incoming,
  kpiTiles: incoming?.kpiTiles?.length ? incoming.kpiTiles : defaultKpiTiles
});

const extToType = (name: string): Source['type'] => {
  if (name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.markdown')) return 'markdown';
  return 'text';
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [units, setUnits] = useState<UnitNode[]>([]);
  const [reviews, setReviews] = useState<ReviewEvent[]>([]);
  const [timers, setTimers] = useState<TimerEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(fallbackSettings);

  const refresh = async () => {
    await ensureSeeded();
    const [s, u, r, t, st] = await Promise.all([
      db.sources.toArray(),
      db.units.toArray(),
      db.reviews.orderBy('reviewedAt').reverse().toArray(),
      db.timers.orderBy('createdAt').reverse().toArray(),
      db.settings.get('main')
    ]);
    setSources(s);
    setUnits(u);
    setReviews(r);
    setTimers(t);
    setSettings(normalizeSettings(st));
  };

  useEffect(() => { void refresh(); }, []);

  const reviewUnit = async (unitId: string, rating: Rating, writtenRecall: string, reviewAt?: string, durationMinutes?: number) => {
    const unit = await db.units.get(unitId);
    if (!unit) return;
    const at = reviewAt ? new Date(reviewAt) : new Date();
    const next = scheduleNext(unit, rating, at);
    await db.units.update(unitId, next);
    await db.reviews.add({
      id: crypto.randomUUID(),
      unitId,
      reviewedAt: toDateOnly(at),
      rating,
      writtenRecall,
      previousDueAt: unit.dueAt,
      nextDueAt: next.dueAt,
      durationMinutes
    });
    await refresh();
  };

  const addSourceFromFile = async (file: File) => {
    const text = file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt') ? await file.text() : '';
    const sourceId = crypto.randomUUID();
    const today = toDateOnly(new Date());
    const source: Source = {
      id: sourceId,
      title: file.name.replace(/\.[^.]+$/, ''),
      type: extToType(file.name),
      originPath: URL.createObjectURL(file),
      parseStatus: 'ready',
      createdAt: today,
      updatedAt: today,
      priority: 1
    };
    const rootId = crypto.randomUUID();
    const pieces = text ? text.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean) : ['Imported binary source'];
    const nodes: UnitNode[] = [{
      id: rootId,
      sourceId,
      parentId: null,
      title: 'Imported sections',
      isLeaf: false,
      path: 'Imported sections',
      locationLabel: `${pieces.length} sections`,
      locationPayload: {},
      estimatedPages: 0,
      estimatedMinutes: 0,
      dueAt: null,
      lastReviewedAt: null,
      stability: 0,
      difficulty: 0,
      retrievability: 0,
      reviewCount: 0,
      lapseCount: 0
    }];

    pieces.slice(0, 80).forEach((chunk, index) => {
      nodes.push({
        id: crypto.randomUUID(),
        sourceId,
        parentId: rootId,
        title: `Section ${index + 1}`,
        isLeaf: true,
        path: `Imported sections > Section ${index + 1}`,
        locationLabel: `part ${index + 1}`,
        locationPayload: { page: index + 1 },
        estimatedPages: 1,
        estimatedMinutes: Math.max(1, Math.round(chunk.length / 800)),
        dueAt: null,
        lastReviewedAt: null,
        stability: 1,
        difficulty: 5,
        retrievability: 0,
        reviewCount: 0,
        lapseCount: 0,
        content: chunk
      });
    });

    await db.transaction('rw', db.sources, db.units, async () => {
      await db.sources.add(source);
      await db.units.bulkAdd(nodes);
    });
    await refresh();
  };

  const recordTimerEvent = async (event: Omit<TimerEvent, 'id' | 'createdAt'>) => {
    await db.timers.add({ id: crypto.randomUUID(), createdAt: toDateOnly(new Date()), ...event });
    await refresh();
  };

  const updateSettings = async (nextSettings: Settings) => {
    const normalized = normalizeSettings(nextSettings);
    await db.settings.put(normalized, 'main');
    setSettings(normalized);
  };

  const value = useMemo(() => ({ sources, units, reviews, timers, settings, refresh, reviewUnit, addSourceFromFile, recordTimerEvent, updateSettings }), [sources, units, reviews, timers, settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AppProvider missing');
  return ctx;
}
