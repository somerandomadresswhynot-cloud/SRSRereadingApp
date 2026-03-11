import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, ensureSeeded } from './db';
import { scheduleNext } from './scheduler';
import type { Rating, ReviewEvent, Settings, Source, UnitNode } from './types';

interface AppState {
  sources: Source[];
  units: UnitNode[];
  reviews: ReviewEvent[];
  settings: Settings;
  refresh: () => Promise<void>;
  reviewUnit: (unitId: string, rating: Rating, writtenRecall: string) => Promise<void>;
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
  density: 'comfortable'
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [units, setUnits] = useState<UnitNode[]>([]);
  const [reviews, setReviews] = useState<ReviewEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(fallbackSettings);

  const refresh = async () => {
    await ensureSeeded();
    const [s, u, r, st] = await Promise.all([db.sources.toArray(), db.units.toArray(), db.reviews.orderBy('reviewedAt').reverse().toArray(), db.settings.get('main')]);
    setSources(s);
    setUnits(u);
    setReviews(r);
    if (st) setSettings(st);
  };

  useEffect(() => { void refresh(); }, []);

  const reviewUnit = async (unitId: string, rating: Rating, writtenRecall: string) => {
    const unit = await db.units.get(unitId);
    if (!unit) return;
    const next = scheduleNext(unit, rating, new Date());
    await db.units.update(unitId, next);
    await db.reviews.add({ id: crypto.randomUUID(), unitId, reviewedAt: new Date().toISOString(), rating, writtenRecall, previousDueAt: unit.dueAt, nextDueAt: next.dueAt });
    await refresh();
  };

  const updateSettings = async (nextSettings: Settings) => {
    await db.settings.put(nextSettings, 'main');
    setSettings(nextSettings);
  };

  const value = useMemo(() => ({ sources, units, reviews, settings, refresh, reviewUnit, updateSettings }), [sources, units, reviews, settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AppProvider missing');
  return ctx;
}
