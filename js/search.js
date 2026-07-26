'use strict';

import { normalizeText } from './utils.js';

function tokens(value) {
  return normalizeText(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = temp;
    }
  }
  return row[b.length];
}

function tokenScore(queryToken, candidateToken) {
  if (queryToken === candidateToken) return 28;
  if (candidateToken.startsWith(queryToken)) return 21;
  if (candidateToken.includes(queryToken)) return 15;
  if (queryToken.length >= 4) {
    const distance = levenshtein(queryToken, candidateToken);
    if (distance === 1) return 13;
    if (distance === 2 && queryToken.length >= 6) return 8;
  }
  return 0;
}

export function scoreExercise(id, exercise, query, searchableText = '') {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 1;
  const name = normalizeText(exercise.name || '');
  const muscle = normalizeText([exercise.muscle, ...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])].join(' '));
  const equipment = normalizeText(exercise.equipment || '');
  const movement = normalizeText([exercise.movement, exercise.level].join(' '));
  const haystack = normalizeText(searchableText || [id, name, muscle, equipment, movement].join(' '));
  let score = 0;
  if (name === normalizedQuery) score += 160;
  else if (name.startsWith(normalizedQuery)) score += 105;
  else if (name.includes(normalizedQuery)) score += 75;
  if (muscle.includes(normalizedQuery)) score += 42;
  if (equipment.includes(normalizedQuery)) score += 30;
  if (haystack.includes(normalizedQuery)) score += 24;

  const queryTokens = tokens(normalizedQuery);
  const nameTokens = [...new Set(tokens(name))];
  const candidateTokens = [...new Set(tokens(haystack))];
  let matched = 0;
  for (const queryToken of queryTokens) {
    const bestName = nameTokens.reduce((max, token) => Math.max(max, tokenScore(queryToken, token)), 0);
    const best = candidateTokens.reduce((max, token) => Math.max(max, tokenScore(queryToken, token)), 0);
    score += best + Math.round(bestName * 1.15);
    if (best > 0) matched += 1;
  }
  if (matched === queryTokens.length) score += 28;
  if (!matched) return 0;
  return score;
}

export function searchExerciseEntries(entries, query, searchableTextBuilder) {
  return entries
    .map(([id, exercise]) => ({ id, exercise, score: scoreExercise(id, exercise, query, searchableTextBuilder(id, exercise)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'es'))
    .map(({ id, exercise }) => [id, exercise]);
}

export function suggestedSearches(query = '') {
  const base = ['pecho con mancuernas', 'espalda en polea', 'piernas en máquina', 'core sin material', 'glúteos con banda', 'movilidad de hombros'];
  const normalized = normalizeText(query);
  if (!normalized) return base;
  return base.filter((item) => normalizeText(item).includes(normalized) || normalized.split(' ').some((token) => normalizeText(item).includes(token))).slice(0, 4);
}
