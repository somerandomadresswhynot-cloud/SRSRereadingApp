export type SourceType = 'pdf' | 'markdown' | 'text';
export type Rating = 'Easy' | 'With Effort' | 'Hard' | 'Again';

export interface Source {
  id: string;
  title: string;
  type: SourceType;
  originPath: string;
  parseStatus: 'ready';
  createdAt: string;
  updatedAt: string;
  priority: number;
}

export interface UnitNode {
  id: string;
  sourceId: string;
  parentId: string | null;
  title: string;
  isLeaf: boolean;
  path: string;
  locationLabel: string;
  locationPayload: Record<string, string | number>;
  estimatedPages: number;
  estimatedMinutes: number;
  dueAt: string | null;
  lastReviewedAt: string | null;
  stability: number;
  difficulty: number;
  retrievability: number;
  reviewCount: number;
  lapseCount: number;
  content?: string;
}

export interface ReviewEvent {
  id: string;
  unitId: string;
  reviewedAt: string;
  rating: Rating;
  writtenRecall: string;
  previousDueAt: string | null;
  nextDueAt: string;
  durationMinutes?: number;
}

export interface TimerEvent {
  id: string;
  unitId: string;
  startedAt: string;
  endedAt: string;
  minutesSpent: number;
  createdAt: string;
  note?: string;
}

export interface DashboardTileLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
  collapsed?: boolean;
}

export interface Settings {
  targetReviewMinutesPerDay: number;
  targetLearningMinutesPerDay: number;
  maxTotalMinutesPerDay: number;
  targetRetention: number;
  defaultMinutesPerPage: number;
  manualReviewsAffectScheduling: boolean;
  allowNewItemsWhenLoadHigh: boolean;
  density: 'compact' | 'comfortable';
  kpiTiles: DashboardTileLayout[];
}
