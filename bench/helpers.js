const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const DB_PATH = path.resolve(process.cwd(), 'bench.db');
const ITERATIONS = 10;

const assertPreconditions = () => {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found: ${DB_PATH}. Run "npm run db:generate" first.`);
  }
};

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const formatMs = (value) => value.toFixed(value >= 100 ? 1 : value >= 10 ? 2 : value >= 1 ? 3 : 4);

const summarize = (samples) => ({
  avgMs: mean(samples.map((sample) => sample.elapsedMs)),
});

const collectSample = (runQuery) => {
  const startedAt = performance.now();
  const rows = runQuery();
  const elapsedMs = performance.now() - startedAt;

  return {
    elapsedMs,
    rowCount: Array.isArray(rows) ? rows.length : rows ? 1 : 0,
  };
};

const printTable = (headers, rows) => {
  const widths = headers.map((header, index) => {
    return Math.max(header.length, ...rows.map((row) => row[index].length));
  });

  const formatRow = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');

  console.log(formatRow(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  rows.forEach((row) => {
    console.log(formatRow(row));
  });
};

module.exports = {
  DB_PATH,
  ITERATIONS,
  assertPreconditions,
  summarize,
  formatMs,
  collectSample,
  printTable,
};
