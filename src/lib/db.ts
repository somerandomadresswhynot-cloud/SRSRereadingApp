import Dexie, { type Table } from 'dexie';
import type { ReviewEvent, Settings, Source, TimerEvent, UnitNode } from './types';

export class SrsDb extends Dexie {
  sources!: Table<Source, string>;
  units!: Table<UnitNode, string>;
  reviews!: Table<ReviewEvent, string>;
  settings!: Table<Settings, string>;
  timers!: Table<TimerEvent, string>;

  constructor() {
    super('srs-rereading-db');
    this.version(1).stores({
      sources: 'id, title, type',
      units: 'id, sourceId, parentId, isLeaf, dueAt',
      reviews: 'id, unitId, reviewedAt',
      settings: '++id'
    });
    this.version(2).stores({
      sources: 'id, title, type',
      units: 'id, sourceId, parentId, isLeaf, dueAt',
      reviews: 'id, unitId, reviewedAt',
      settings: '++id',
      timers: 'id, unitId, createdAt'
    }).upgrade(async (tx) => {
      const existingSources = await tx.table('sources').count();
      if (existingSources > 0) {
        await tx.table('sources').clear();
        await tx.table('units').clear();
        await tx.table('reviews').clear();
      }
    });
  }
}

export const db = new SrsDb();

const defaultSettings: Settings = {
  targetReviewMinutesPerDay: 35,
  targetLearningMinutesPerDay: 20,
  maxTotalMinutesPerDay: 60,
  targetRetention: 0.9,
  defaultMinutesPerPage: 1.7,
  manualReviewsAffectScheduling: true,
  allowNewItemsWhenLoadHigh: false,
  density: 'comfortable'
};

export async function ensureSeeded() {
  if (await db.settings.get('main')) return;
  await db.settings.put(defaultSettings, 'main');
}
