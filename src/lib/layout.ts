import type { DashboardTileLayout } from './types';

export const defaultQueueTiles: DashboardTileLayout[] = [
  { id: 'nextRecommended', x: 0, y: 0, w: 6, h: 3 },
  { id: 'summary', x: 0, y: 3, w: 6, h: 2 },
  { id: 'basicKpis', x: 0, y: 5, w: 6, h: 6 },
  { id: 'projectedLoad', x: 0, y: 11, w: 6, h: 4 }
];

export const defaultKpiTiles: DashboardTileLayout[] = [
  { id: 'learningToday', x: 0, y: 0, w: 3, h: 2 },
  { id: 'reviewToday', x: 3, y: 0, w: 3, h: 2 },
  { id: 'avgReviewMinutes', x: 0, y: 2, w: 3, h: 2 },
  { id: 'dueDistribution', x: 3, y: 2, w: 3, h: 2 }
];
