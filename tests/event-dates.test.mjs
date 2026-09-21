import assert from 'node:assert/strict';
import { bostonDateKey, normalizeDateValue, parseDateLoose, withinHorizon } from '../scripts/fetch-events.mjs';

assert.equal(parseDateLoose('Monday, September 21, 2026'), '2026-09-21');
assert.equal(parseDateLoose('September 21, 2026 7:30 pm'), '2026-09-21T23:30:00.000Z');
assert.equal(normalizeDateValue('2026-09-21T19:30:00'), '2026-09-21T23:30:00.000Z');
assert.equal(normalizeDateValue('09/21/2026'), '2026-09-21');
assert.equal(bostonDateKey('2026-09-22T01:00:00.000Z'), '2026-09-21');

const now = new Date('2026-09-21T16:00:00.000Z');
assert.equal(withinHorizon({ start:'2026-09-20', end:'2026-09-22' },45,now), true);
assert.equal(withinHorizon({ start:'2026-09-20', end:'2026-09-20' },45,now), false);
assert.equal(withinHorizon({ start:'2026-11-06' },45,now), false);

console.log('Event date tests passed.');
