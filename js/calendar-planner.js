'use strict';

import { clone, isoDay, numberValue, startOfWeek, uid } from './utils.js?v=421';

export const WEEKDAY_LABELS = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
  { value: 7, short: 'D', label: 'Domingo' }
];

const DEFAULT_WEEKDAYS = {
  1: [3],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7]
};

function localDate(value = new Date()) {
  if (value instanceof Date) return new Date(value);
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T12:00:00`);
  return new Date(value);
}

function addDays(value, amount) {
  const date = localDate(value);
  date.setDate(date.getDate() + Number(amount || 0));
  return date;
}

function isoWeekday(value) {
  const day = localDate(value).getDay();
  return day === 0 ? 7 : day;
}

function dateCompare(first, second) {
  return String(first).localeCompare(String(second));
}

function nextSelectedDate(from, weekdays) {
  const selected = new Set(weekdays);
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = addDays(from, offset);
    if (selected.has(isoWeekday(candidate))) return isoDay(candidate);
  }
  return isoDay(from);
}

function cleanWeekdays(values, fallbackDays = 3) {
  const clean = [...new Set((values || []).map(Number).filter((value) => value >= 1 && value <= 7))]
    .sort((a, b) => a - b);
  if (clean.length) return clean;
  const count = Math.max(1, Math.min(7, numberValue(fallbackDays, 3)));
  return [...DEFAULT_WEEKDAYS[count]];
}

export function createDefaultPlanner(profile = {}, nextWorkoutIndex = 0, planId = '', now = new Date()) {
  const weekdays = cleanWeekdays(null, profile.days || 3);
  return {
    id: uid('planner'),
    enabled: true,
    planId: String(planId || ''),
    weekdays,
    preferredTime: '18:00',
    anchorDate: nextSelectedDate(now, weekdays),
    anchorPlanDayIndex: Math.max(0, numberValue(nextWorkoutIndex, 0)),
    overrides: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function normalizePlanner(raw, profile = {}, nextWorkoutIndex = 0, planId = '') {
  if (!raw || (raw.planId && planId && raw.planId !== planId)) {
    return createDefaultPlanner(profile, nextWorkoutIndex, planId);
  }

  const weekdays = cleanWeekdays(raw.weekdays, profile.days || 3);
  const anchorDate = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.anchorDate || ''))
    ? raw.anchorDate
    : nextSelectedDate(new Date(), weekdays);

  const overrides = {};
  for (const [date, item] of Object.entries(raw.overrides || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !item) continue;
    if (item.type === 'skip') {
      overrides[date] = {
        type: 'skip',
        planDayIndex: Math.max(0, numberValue(item.planDayIndex, 0)),
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    } else if (item.type === 'move' && /^\d{4}-\d{2}-\d{2}$/.test(String(item.targetDate || ''))) {
      overrides[date] = {
        type: 'move',
        targetDate: item.targetDate,
        planDayIndex: Math.max(0, numberValue(item.planDayIndex, 0)),
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    }
  }

  return {
    id: raw.id || uid('planner'),
    enabled: raw.enabled !== false,
    planId: String(planId || raw.planId || ''),
    weekdays,
    preferredTime: /^\d{2}:\d{2}$/.test(String(raw.preferredTime || ''))
      ? raw.preferredTime
      : '18:00',
    anchorDate,
    anchorPlanDayIndex: Math.max(0, numberValue(raw.anchorPlanDayIndex, nextWorkoutIndex)),
    overrides,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

export function updatePlannerSchedule(planner, {
  weekdays,
  preferredTime,
  nextWorkoutIndex = 0,
  planId = '',
  resetFrom = new Date()
} = {}) {
  const clean = cleanWeekdays(weekdays, weekdays?.length || 3);
  return {
    ...clone(planner || {}),
    id: planner?.id || uid('planner'),
    enabled: true,
    planId: String(planId || planner?.planId || ''),
    weekdays: clean,
    preferredTime: /^\d{2}:\d{2}$/.test(String(preferredTime || ''))
      ? preferredTime
      : '18:00',
    anchorDate: nextSelectedDate(resetFrom, clean),
    anchorPlanDayIndex: Math.max(0, numberValue(nextWorkoutIndex, 0)),
    overrides: {},
    createdAt: planner?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function recurringIndexForDate(planner, dateValue) {
  const target = isoDay(dateValue);
  if (!target || dateCompare(target, planner.anchorDate) < 0) return null;
  const selected = new Set(planner.weekdays);
  let index = -1;
  for (let cursor = localDate(planner.anchorDate); dateCompare(isoDay(cursor), target) <= 0; cursor = addDays(cursor, 1)) {
    if (selected.has(isoWeekday(cursor))) index += 1;
  }
  return selected.has(isoWeekday(target)) ? index : null;
}

function historyDate(session) {
  return isoDay(session.finishedAt || session.startedAt);
}

function completionForOccurrence(history, occurrence, planDay) {
  const explicit = (history || []).find((session) =>
    session.plannerOccurrenceId === occurrence.id
    || session.scheduledDate === occurrence.date
  );
  if (explicit) return explicit;

  return (history || []).find((session) =>
    historyDate(session) === occurrence.date
    && (
      (planDay?.id && session.planDayId === planDay.id)
      || (occurrence.planDayIndex === session.sourcePlanDayIndex)
      || (occurrence.planDayIndex === session.planDayIndex)
    )
  ) || null;
}

function statusForDate(date, completed, overrideType = '') {
  if (completed) return 'completed';
  if (overrideType === 'skip') return 'skipped';
  if (overrideType === 'move') return 'moved';
  const today = isoDay(new Date());
  if (dateCompare(date, today) < 0) return 'missed';
  if (date === today) return 'today';
  return 'planned';
}

function baseOccurrence(planner, plan, history, date) {
  const index = recurringIndexForDate(planner, date);
  if (index === null || !plan?.days?.length) return null;

  const planDayIndex = (planner.anchorPlanDayIndex + index) % plan.days.length;
  const planDay = plan.days[planDayIndex];
  const override = planner.overrides?.[date];
  const occurrence = {
    id: `planner-${date}`,
    date,
    originalDate: date,
    planDayIndex,
    planDayId: planDay?.id || '',
    name: planDay?.name || `Día ${planDayIndex + 1}`,
    focus: planDay?.focus || 'Rutina',
    preferredTime: planner.preferredTime,
    movedTo: override?.type === 'move' ? override.targetDate : '',
    source: 'recurring'
  };
  const completedSession = completionForOccurrence(history, occurrence, planDay);
  occurrence.completedSession = completedSession || null;
  occurrence.status = statusForDate(date, completedSession, override?.type || '');
  return occurrence;
}

function movedOccurrencesForDate(planner, plan, history, date) {
  const items = [];
  for (const [sourceDate, override] of Object.entries(planner.overrides || {})) {
    if (override.type !== 'move' || override.targetDate !== date || !plan?.days?.length) continue;
    const planDayIndex = override.planDayIndex % plan.days.length;
    const planDay = plan.days[planDayIndex];
    const occurrence = {
      id: `planner-moved-${sourceDate}-${date}`,
      date,
      originalDate: sourceDate,
      planDayIndex,
      planDayId: planDay?.id || '',
      name: planDay?.name || `Día ${planDayIndex + 1}`,
      focus: planDay?.focus || 'Rutina',
      preferredTime: planner.preferredTime,
      source: 'moved'
    };
    const completedSession = completionForOccurrence(history, occurrence, planDay);
    occurrence.completedSession = completedSession || null;
    occurrence.status = statusForDate(date, completedSession);
    items.push(occurrence);
  }
  return items;
}

export function occurrencesForDate(planner, plan, history = [], dateValue = new Date()) {
  if (!planner?.enabled || !plan?.days?.length) return [];
  const date = isoDay(dateValue);
  const items = [];
  const base = baseOccurrence(planner, plan, history, date);
  if (base) items.push(base);
  items.push(...movedOccurrencesForDate(planner, plan, history, date));
  return items;
}

export function buildPlannerWeek(planner, plan, history = [], weekDate = new Date()) {
  const start = startOfWeek(localDate(weekDate));
  const today = isoDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const dateObject = addDays(start, index);
    const date = isoDay(dateObject);
    const occurrences = occurrencesForDate(planner, plan, history, date);
    return {
      date,
      dateObject,
      isoWeekday: index + 1,
      label: WEEKDAY_LABELS[index].label,
      short: WEEKDAY_LABELS[index].short,
      dayNumber: dateObject.getDate(),
      monthLabel: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(dateObject),
      today: date === today,
      occurrences
    };
  });

  const completed = days.flatMap((day) => day.occurrences).filter((item) => item.status === 'completed').length;
  const missed = days.flatMap((day) => day.occurrences).filter((item) => item.status === 'missed').length;
  const planned = days.flatMap((day) => day.occurrences).filter((item) => ['planned', 'today'].includes(item.status)).length;

  return {
    start: isoDay(start),
    end: isoDay(addDays(start, 6)),
    label: `${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(start)} – ${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(addDays(start, 6))}`,
    days,
    completed,
    missed,
    planned
  };
}

export function getMissedOccurrences(planner, plan, history = [], now = new Date(), limitDays = 45) {
  if (!planner?.enabled || !plan?.days?.length) return [];
  const today = isoDay(now);
  const start = dateCompare(planner.anchorDate, isoDay(addDays(now, -limitDays))) > 0
    ? planner.anchorDate
    : isoDay(addDays(now, -limitDays));

  const results = [];
  for (let cursor = localDate(start); dateCompare(isoDay(cursor), today) < 0; cursor = addDays(cursor, 1)) {
    for (const occurrence of occurrencesForDate(planner, plan, history, cursor)) {
      if (['completed', 'skipped', 'moved'].includes(occurrence.status)) continue;
      if (dateCompare(occurrence.date, today) < 0) {
        results.push({ ...occurrence, status: 'missed' });
      }
    }
  }
  return results.sort((a, b) => dateCompare(a.date, b.date));
}

export function findNextOccurrence(planner, plan, history = [], now = new Date(), maxDays = 60) {
  if (!planner?.enabled || !plan?.days?.length) return null;
  for (let offset = 0; offset <= maxDays; offset += 1) {
    const date = addDays(now, offset);
    const item = occurrencesForDate(planner, plan, history, date)
      .find((occurrence) => ['today', 'planned', 'missed'].includes(occurrence.status));
    if (item) return item;
  }
  return null;
}

export function buildPlannerSummary(planner, plan, history = [], now = new Date()) {
  const week = buildPlannerWeek(planner, plan, history, now);
  const missed = getMissedOccurrences(planner, plan, history, now);
  const next = findNextOccurrence(planner, plan, history, now);
  const totalWeek = week.completed + week.missed + week.planned;
  return {
    week,
    missed,
    next,
    adherence: totalWeek ? Math.round((week.completed / totalWeek) * 100) : 0,
    message: missed.length
      ? `${missed.length} sesión${missed.length === 1 ? '' : 'es'} pendiente${missed.length === 1 ? '' : 's'} de reorganizar.`
      : next
        ? `Tu próxima sesión está prevista para ${formatPlannerDate(next.date)}.`
        : 'La semana está libre.'
  };
}

export function movePlannerOccurrence(planner, occurrence, targetDate) {
  if (!occurrence?.originalDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || ''))) return clone(planner);
  const next = clone(planner);
  next.overrides = next.overrides || {};
  next.overrides[occurrence.originalDate] = {
    type: 'move',
    targetDate,
    planDayIndex: occurrence.planDayIndex,
    updatedAt: new Date().toISOString()
  };
  next.updatedAt = new Date().toISOString();
  return next;
}

export function skipPlannerOccurrence(planner, occurrence) {
  if (!occurrence?.originalDate) return clone(planner);
  const next = clone(planner);
  next.overrides = next.overrides || {};
  next.overrides[occurrence.originalDate] = {
    type: 'skip',
    planDayIndex: occurrence.planDayIndex,
    updatedAt: new Date().toISOString()
  };
  next.updatedAt = new Date().toISOString();
  return next;
}

function occupiedDates(planner, plan, history, from, to) {
  const occupied = new Set();
  for (let cursor = localDate(from); dateCompare(isoDay(cursor), isoDay(to)) <= 0; cursor = addDays(cursor, 1)) {
    const active = occurrencesForDate(planner, plan, history, cursor)
      .some((item) => !['skipped', 'moved', 'completed'].includes(item.status));
    if (active) occupied.add(isoDay(cursor));
  }
  return occupied;
}

function targetScore(date, planner, occupied, assigned) {
  const iso = isoDay(date);
  if (occupied.has(iso) || assigned.has(iso)) return -10000;
  let score = 100;
  if (planner.weekdays.includes(isoWeekday(date))) score += 24;
  const before = isoDay(addDays(date, -1));
  const after = isoDay(addDays(date, 1));
  if (!occupied.has(before) && !assigned.has(before)) score += 13;
  if (!occupied.has(after) && !assigned.has(after)) score += 13;
  score -= Math.max(0, (localDate(date) - new Date()) / 86400000);
  return score;
}

export function smartReplanMissed(planner, plan, history = [], now = new Date()) {
  const missed = getMissedOccurrences(planner, plan, history, now);
  if (!missed.length) return { planner: clone(planner), moved: [] };

  const next = clone(planner);
  const from = isoDay(now);
  const to = isoDay(addDays(now, 21));
  const occupied = occupiedDates(next, plan, history, from, to);
  const assigned = new Set();
  const moved = [];

  for (const occurrence of missed) {
    const candidates = Array.from({ length: 21 }, (_, index) => addDays(now, index))
      .map((date) => ({ date: isoDay(date), score: targetScore(date, next, occupied, assigned) }))
      .sort((a, b) => b.score - a.score || dateCompare(a.date, b.date));

    const best = candidates[0];
    if (!best || best.score < 0) continue;
    next.overrides = next.overrides || {};
    next.overrides[occurrence.originalDate] = {
      type: 'move',
      targetDate: best.date,
      planDayIndex: occurrence.planDayIndex,
      updatedAt: new Date().toISOString()
    };
    assigned.add(best.date);
    moved.push({ ...occurrence, targetDate: best.date });
  }

  next.updatedAt = new Date().toISOString();
  return { planner: next, moved };
}

export function formatPlannerDate(value, options = {}) {
  const date = localDate(value);
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...options
  }).format(date);
}

export function plannerWeekOffsetDate(offset = 0) {
  return addDays(startOfWeek(new Date()), Number(offset || 0) * 7);
}
