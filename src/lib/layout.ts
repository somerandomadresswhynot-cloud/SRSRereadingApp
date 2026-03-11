import type { DashboardTileLayout } from './types';

export const defaultKpiTiles: DashboardTileLayout[] = [
  { id: 'learningToday', x: 0, y: 0, w: 3, h: 2 },
  { id: 'reviewToday', x: 3, y: 0, w: 3, h: 2 },
  { id: 'avgReviewMinutes', x: 0, y: 2, w: 3, h: 2 },
  { id: 'dueDistribution', x: 3, y: 2, w: 3, h: 2 }
];
