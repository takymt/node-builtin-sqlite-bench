#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { DatabaseSync } = require('node:sqlite');
const BetterSqlite3 = require('better-sqlite3');

const QUERIES = [
  {
    name: 'point_lookup',
    sql: 'SELECT * FROM data WHERE id = ?',
    params: [50_000],
  },
  {
    name: 'limit_10',
    sql: 'SELECT * FROM data LIMIT 10',
    params: [],
  },
  {
    name: 'limit_1000',
    sql: 'SELECT * FROM data LIMIT 1000',
    params: [],
  },
  {
    name: 'scan_all',
    sql: 'SELECT * FROM data',
    params: [],
  },
];

function parseArgs(argv) {
  const options = {
    db: path.resolve(process.cwd(), 'bench.db'),
    iterations: 10,
    output: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--db') {
      options.db = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--iterations') {
      options.iterations = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
    }
  }

  if (!Number.isInteger(options.iterations) || options.iterations <= 0) {
    throw new Error('--iterations must be a positive integer');
  }
  return options;
}

function assertPreconditions(options) {
  if (!fs.existsSync(options.db)) {
    throw new Error(`Database not found: ${options.db}. Run "npm run db:generate" first.`);
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMs(value) {
  return value.toFixed(value >= 100 ? 1 : value >= 10 ? 2 : 3);
}

function summarize(samples) {
  return {
    avgMs: mean(samples.map((sample) => sample.elapsedMs)),
    medianMs: median(samples.map((sample) => sample.elapsedMs)),
    minMs: Math.min(...samples.map((sample) => sample.elapsedMs)),
    maxMs: Math.max(...samples.map((sample) => sample.elapsedMs)),
  };
}

function printTable(results) {
  const headers = ['Driver', 'Query', 'Avg ms', 'Median ms', 'Min ms', 'Max ms'];
  const rows = [];

  for (const result of results) {
    for (const query of result.queries) {
      rows.push([
        result.driver,
        query.name,
        formatMs(query.summary.avgMs),
        formatMs(query.summary.medianMs),
        formatMs(query.summary.minMs),
        formatMs(query.summary.maxMs),
      ]);
    }
  }

  const widths = headers.map((header, index) => {
    return Math.max(header.length, ...rows.map((row) => row[index].length));
  });

  const formatRow = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');

  console.log(formatRow(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log(formatRow(row));
  }
}

function collectSample(runQuery) {
  const startedAt = performance.now();
  const rows = runQuery();
  const elapsedMs = performance.now() - startedAt;

  return {
    elapsedMs,
    rowCount: Array.isArray(rows) ? rows.length : rows ? 1 : 0,
  };
}

function benchmarkNodeSqlite(dbPath, options) {
  const db = new DatabaseSync(dbPath, { readOnly: true });

  try {
    const queries = QUERIES.map((query) => {
      const stmt = db.prepare(query.sql);

      stmt.all(...query.params);

      const samples = [];
      for (let i = 0; i < options.iterations; i += 1) {
        samples.push(collectSample(() => stmt.all(...query.params)));
      }

      return {
        name: query.name,
        sql: query.sql,
        rowCount: samples[0].rowCount,
        summary: summarize(samples),
        samples,
      };
    });

    return {
      driver: 'node:sqlite',
      queries,
    };
  } finally {
    db.close();
  }
}

function benchmarkBetterSqlite3(dbPath, options) {
  const db = new BetterSqlite3(dbPath, { readonly: true, fileMustExist: true });

  try {
    const queries = QUERIES.map((query) => {
      const stmt = db.prepare(query.sql);

      stmt.all(...query.params);

      const samples = [];
      for (let i = 0; i < options.iterations; i += 1) {
        samples.push(collectSample(() => stmt.all(...query.params)));
      }

      return {
        name: query.name,
        sql: query.sql,
        rowCount: samples[0].rowCount,
        summary: summarize(samples),
        samples,
      };
    });

    return {
      driver: 'better-sqlite3',
      queries,
    };
  } finally {
    db.close();
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  assertPreconditions(options);

  const results = [
    benchmarkNodeSqlite(options.db, options),
    benchmarkBetterSqlite3(options.db, options),
  ];

  printTable(results);

  if (options.output) {
    fs.writeFileSync(
      options.output,
      JSON.stringify(
        {
          nodeVersion: process.version,
          options,
          results,
        },
        null,
        2
      )
    );
    console.log(`\nWrote ${options.output}`);
  }
}

main();
