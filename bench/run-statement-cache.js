#!/usr/bin/env node

const { DatabaseSync } = require('node:sqlite');
const {
  DB_PATH,
  ITERATIONS,
  assertPreconditions,
  summarize,
  formatMs,
  collectSample,
  printTable,
} = require('./helpers');

const TOTAL_ROWS = 100_000;

const getId = (index) => 1 + (index % TOTAL_ROWS);

const createCases = (db) => {
  const sameTextStore = db.createTagStore();

  return [
    {
      name: 'cache_miss',
      run: (index) => db.prepare('SELECT * FROM data WHERE id = ?').get(getId(index)),
    },
    {
      name: 'cache_hit',
      run: (index) => sameTextStore.get`SELECT * FROM data WHERE id = ${getId(index)}`,
    },
  ];
};

const benchmarkStatementCache = () => {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  try {
    return createCases(db).map((benchmarkCase) => {
      benchmarkCase.run(0);

      const samples = [];
      for (let index = 0; index < ITERATIONS; index += 1) {
        samples.push(collectSample(() => benchmarkCase.run(index)));
      }

      return {
        name: benchmarkCase.name,
        summary: summarize(samples),
      };
    });
  } finally {
    db.close();
  }
};

const printResults = (cases) => {
  const headers = ['Case', 'node:sqlite'];
  const rows = cases.map((benchmarkCase) => [
    benchmarkCase.name,
    formatMs(benchmarkCase.summary.avgMs),
  ]);

  printTable(headers, rows);
};

const main = () => {
  assertPreconditions();
  printResults(benchmarkStatementCache());
};

main();
