// ponytail: tiny assert check for export-format clock parsing
const assert = require('assert');

function parseClock(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (clock) {
    return new Date(1970, 0, 1, Number(clock[1]), Number(clock[2]), Number(clock[3] || 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatExportPause(value) {
  const d = parseClock(value);
  if (!d) return '0h 0m';
  return `${d.getHours()}h ${d.getMinutes()}m`;
}

function formatExportTime(value) {
  const d = parseClock(value);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

assert.strictEqual(formatExportTime('22:00'), '22:00');
assert.strictEqual(formatExportPause('00:30'), '0h 30m');
assert.strictEqual(formatExportTime('not-a-time'), '');
console.log('export-format.selfcheck ok');
