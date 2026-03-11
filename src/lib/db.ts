import Dexie, { type Table } from 'dexie';
import { Rating, type ReviewEvent, type Settings, type Source, type UnitNode } from './types';

export class SrsDb extends Dexie {
  sources!: Table<Source, string>;
  units!: Table<UnitNode, string>;
  reviews!: Table<ReviewEvent, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('srs-rereading-db');
    this.version(1).stores({
      sources: 'id, title, type',
      units: 'id, sourceId, parentId, isLeaf, dueAt',
      reviews: 'id, unitId, reviewedAt',
      settings: '++id'
    });
  }
}

export const db = new SrsDb();

const now = new Date();
const day = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * day).toISOString();

const sources: Source[] = [
  { id: 's1', title: 'Deep Work Notes', type: 'markdown', originPath: 'local://deep-work.md', parseStatus: 'ready', createdAt: iso(-40), updatedAt: iso(-2), priority: 2 },
  { id: 's2', title: 'Linear Algebra Primer', type: 'pdf', originPath: '/sample.pdf', parseStatus: 'ready', createdAt: iso(-30), updatedAt: iso(-1), priority: 3 },
  { id: 's3', title: 'Systems Design Field Guide', type: 'text', originPath: 'local://systems-guide.txt', parseStatus: 'ready', createdAt: iso(-10), updatedAt: iso(-1), priority: 1 }
];

function leaf(id: string, sourceId: string, parentId: string, title: string, path: string, locationLabel: string, p: number, m: number, due: number | null, reviewCount: number, content: string): UnitNode {
  return {
    id, sourceId, parentId, title, isLeaf: true, path, locationLabel,
    locationPayload: { page: p }, estimatedPages: p, estimatedMinutes: m,
    dueAt: due === null ? null : iso(due), lastReviewedAt: reviewCount ? iso(-Math.max(1, Math.abs(due ?? 1))) : null,
    stability: Math.max(1, reviewCount + 1), difficulty: 5 - Math.min(reviewCount, 2), retrievability: 0.8,
    reviewCount, lapseCount: reviewCount > 0 ? 1 : 0, content
  };
}

const units: UnitNode[] = [
  { id: 'n1', sourceId: 's1', parentId: null, title: 'Part I Focus', isLeaf: false, path: 'Part I Focus', locationLabel: 'chapters 1-3', locationPayload: {}, estimatedPages: 0, estimatedMinutes: 0, dueAt: null, lastReviewedAt: null, stability: 0, difficulty: 0, retrievability: 0, reviewCount: 0, lapseCount: 0 },
  leaf('u1', 's1', 'n1', 'The Deep Work Hypothesis', 'Part I > Ch1', '§1', 8, 12, -2, 4, '# The Deep Work Hypothesis\n\nDeep work creates value through concentrated effort.'),
  leaf('u2', 's1', 'n1', 'Shallow Work Risks', 'Part I > Ch2', '§2', 6, 10, 0, 2, '# Shallow Work Risks\n\nBusyness can masquerade as productivity.'),
  leaf('u3', 's1', 'n1', 'Crafting Rituals', 'Part I > Ch3', '§3', 7, 11, 2, 1, '# Crafting Rituals\n\nRituals reduce activation energy for focus.'),
  { id: 'n2', sourceId: 's2', parentId: null, title: 'Foundations', isLeaf: false, path: 'Foundations', locationLabel: 'pages 1-40', locationPayload: {}, estimatedPages: 0, estimatedMinutes: 0, dueAt: null, lastReviewedAt: null, stability: 0, difficulty: 0, retrievability: 0, reviewCount: 0, lapseCount: 0 },
  leaf('u4', 's2', 'n2', 'Vector Spaces', 'Foundations > 1.1', 'p. 3-8', 5, 9, -4, 5, ''),
  leaf('u5', 's2', 'n2', 'Linear Independence', 'Foundations > 1.2', 'p. 9-14', 6, 10, -1, 3, ''),
  leaf('u6', 's2', 'n2', 'Basis and Dimension', 'Foundations > 1.3', 'p. 15-21', 7, 12, 1, 1, ''),
  leaf('u7', 's2', 'n2', 'Rank Intuition', 'Foundations > 1.4', 'p. 22-27', 6, 9, null, 0, ''),
  { id: 'n3', sourceId: 's3', parentId: null, title: 'Reliability', isLeaf: false, path: 'Reliability', locationLabel: 'sections A-C', locationPayload: {}, estimatedPages: 0, estimatedMinutes: 0, dueAt: null, lastReviewedAt: null, stability: 0, difficulty: 0, retrievability: 0, reviewCount: 0, lapseCount: 0 },
  leaf('u8', 's3', 'n3', 'Graceful Degradation', 'Reliability > A', 'Section A', 4, 8, 0, 2, 'Graceful degradation keeps core workflows alive under pressure.'),
  leaf('u9', 's3', 'n3', 'Error Budgets', 'Reliability > B', 'Section B', 5, 9, 3, 1, 'Error budgets align feature velocity with reliability goals.'),
  leaf('u10', 's3', 'n3', 'Backpressure Patterns', 'Reliability > C', 'Section C', 5, 9, null, 0, 'Backpressure prevents cascading failures.'),
  leaf('u11', 's3', 'n3', 'Load Shedding', 'Reliability > D', 'Section D', 3, 6, -3, 4, 'Load shedding preserves latency for high priority traffic.'),
  leaf('u12', 's3', 'n3', 'Observability Loops', 'Reliability > E', 'Section E', 4, 7, 5, 0, 'Observability closes the gap between incidents and learning.')
];

const ratings: Rating[] = ['Easy', 'With Effort', 'Hard', 'Again'];
const reviews: ReviewEvent[] = Array.from({ length: 9 }).map((_, i) => ({
  id: `r${i + 1}`,
  unitId: units.filter((u) => u.isLeaf)[i % 8].id,
  reviewedAt: iso(-(i + 1)),
  rating: ratings[i % ratings.length],
  writtenRecall: ['Remembered key argument.', 'Needed hints but recovered.', 'Weak recall on details.', 'Missed structure completely.'][i % 4],
  previousDueAt: iso(-(i + 2)),
  nextDueAt: iso(-(i - 1))
}));

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
  if (await db.sources.count()) return;
  await db.transaction('rw', db.sources, db.units, db.reviews, db.settings, async () => {
    await db.sources.bulkAdd(sources);
    await db.units.bulkAdd(units);
    await db.reviews.bulkAdd(reviews);
    await db.settings.put(defaultSettings, 'main');
  });
}
