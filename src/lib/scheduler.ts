import { toDateOnly } from './date';
import type { Rating, Settings, UnitNode } from './types';

const msDay = 86400000;

export function dueState(unit: UnitNode, now = new Date()) {
  if (!unit.isLeaf || !unit.dueAt) return 'new';
  const delta = new Date(unit.dueAt).getTime() - now.getTime();
  if (delta < -msDay) return 'overdue';
  if (delta <= msDay) return 'due';
  return 'scheduled';
}

export function scheduleNext(unit: UnitNode, rating: Rating, at = new Date()) {
  const elapsedDays = unit.lastReviewedAt ? Math.max(1, (at.getTime() - new Date(unit.lastReviewedAt).getTime()) / msDay) : 1;
  const baseStability = Math.max(unit.stability || 1, elapsedDays);
  const difficultyShift = rating === 'Easy' ? -0.25 : rating === 'With Effort' ? 0 : rating === 'Hard' ? 0.2 : 0.45;
  const newDifficulty = Math.min(9, Math.max(1, unit.difficulty + difficultyShift));

  let growth = 1;
  if (rating === 'Easy') growth = 2.4;
  if (rating === 'With Effort') growth = 1.75;
  if (rating === 'Hard') growth = 1.3;
  if (rating === 'Again') growth = 0.45;

  const retrievability = Math.exp(-elapsedDays / baseStability);
  const adjustment = (1 - newDifficulty / 12) * (0.6 + retrievability);
  const newStability = Math.max(0.7, baseStability * growth * adjustment);
  const intervalDays = rating === 'Again' ? 1 : Math.max(1, Math.round(newStability * (rating === 'Easy' ? 1.4 : 1)));

  return {
    dueAt: toDateOnly(new Date(at.getTime() + intervalDays * msDay)),
    lastReviewedAt: toDateOnly(at),
    reviewCount: unit.reviewCount + 1,
    lapseCount: unit.lapseCount + (rating === 'Again' ? 1 : 0),
    difficulty: newDifficulty,
    stability: newStability,
    retrievability: Math.exp(-1 / newStability)
  };
}

export function buildProjection(units: UnitNode[], settings: Settings, days = 14) {
  const today = new Date();
  return Array.from({ length: days }).map((_, index) => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    const end = new Date(start.getTime() + msDay);
    const due = units.filter((u) => u.isLeaf && u.dueAt && new Date(u.dueAt) >= start && new Date(u.dueAt) < end);
    const minutes = due.reduce((sum, u) => sum + (u.estimatedMinutes || u.estimatedPages * settings.defaultMinutesPerPage), 0);
    const pages = due.reduce((sum, u) => sum + u.estimatedPages, 0);
    return { dayIndex: index, label: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `Day ${index + 1}`, dueCount: due.length, minutes: Math.round(minutes), pages };
  });
}

export function pickRecommendation(units: UnitNode[], settings: Settings) {
  const now = new Date();
  const leaves = units.filter((u) => u.isLeaf);
  const dueCandidates = leaves.filter((u) => dueState(u, now) === 'overdue' || dueState(u, now) === 'due');
  const projectedTodayMinutes = dueCandidates.reduce((acc, u) => acc + u.estimatedMinutes, 0);
  const allowNew = settings.allowNewItemsWhenLoadHigh || projectedTodayMinutes < settings.maxTotalMinutesPerDay;

  const scoredDue = dueCandidates.map((u) => {
    const overdueDays = u.dueAt ? Math.max(0, Math.floor((now.getTime() - new Date(u.dueAt).getTime()) / msDay)) : 0;
    return { unit: u, score: overdueDays * 10 + (8 - u.estimatedMinutes) + u.reviewCount };
  }).sort((a, b) => b.score - a.score);

  if (scoredDue[0]) {
    return { unit: scoredDue[0].unit, reason: scoredDue[0].unit.dueAt && new Date(scoredDue[0].unit.dueAt) < now ? 'highest-priority overdue review' : 'highest-priority due review', allowNew };
  }

  const newItem = leaves.find((u) => !u.dueAt);
  if (newItem && allowNew) return { unit: newItem, reason: 'selected because it best fits remaining learning budget', allowNew };
  return { unit: newItem ?? leaves[0], reason: 'new unit withheld because projected load is already high', allowNew };
}
