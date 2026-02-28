#!/usr/bin/env node

const { DatabaseSync } = require('node:sqlite');
const BetterSqlite3 = require('better-sqlite3');
const {
  DB_PATH,
  ITERATIONS,
  assertPreconditions,
  summarize,
  formatMs,
  collectSample,
  printTable,
} = require('./helpers');

const QUERIES = [
  {
    sql: 'SELECT * FROM data WHERE id = ?',
    runPrepared: (stmt) => stmt.get(50_000),
    runTagStore: (sqlTagStore) => sqlTagStore.get`SELECT * FROM data WHERE id = ${50_000}`,
  },
  {
    sql: 'SELECT * FROM data LIMIT 10',
    runPrepared: (stmt) => stmt.all(),
    runTagStore: (sqlTagStore) => sqlTagStore.all`SELECT * FROM data LIMIT 10`,
  },
  {
    sql: 'SELECT * FROM data LIMIT 1000',
    runPrepared: (stmt) => stmt.all(),
    runTagStore: (sqlTagStore) => sqlTagStore.all`SELECT * FROM data LIMIT 1000`,
  },
  {
    sql: 'SELECT * FROM data',
    runPrepared: (stmt) => stmt.all(),
    runTagStore: (sqlTagStore) => sqlTagStore.all`SELECT * FROM data`,
  },
];

const benchmarkPreparedDriver = (driver, prepare) => {
  const queries = QUERIES.map((query) => {
    const stmt = prepare(query.sql);

    query.runPrepared(stmt);

    const samples = [];
    for (let index = 0; index < ITERATIONS; index += 1) {
      samples.push(collectSample(() => query.runPrepared(stmt)));
    }

    return {
      sql: query.sql,
      summary: summarize(samples),
    };
  });

  return { driver, queries };
};

const benchmarkNodeSqlite = () => {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  try {
    return benchmarkPreparedDriver('node:sqlite', (sql) => db.prepare(sql));
  } finally {
    db.close();
  }
};

const benchmarkCached = () => {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const sqlTagStore = db.createTagStore();

  try {
    const queries = QUERIES.map((query) => {
      query.runTagStore(sqlTagStore);

      const samples = [];
      for (let index = 0; index < ITERATIONS; index += 1) {
        samples.push(collectSample(() => query.runTagStore(sqlTagStore)));
      }

      return {
        sql: query.sql,
        summary: summarize(samples),
      };
    });

    return { driver: 'node:sqlite(cached)', queries };
  } finally {
    db.close();
  }
};

const benchmarkBetterSqlite3 = () => {
  const db = new BetterSqlite3(DB_PATH, { readonly: true, fileMustExist: true });

  try {
    return benchmarkPreparedDriver('better-sqlite3', (sql) => db.prepare(sql));
  } finally {
    db.close();
  }
};

const printResults = (results) => {
  const byDriver = Object.fromEntries(results.map((result) => [result.driver, result]));
  const headers = ['Query', 'node:sqlite', 'node:sqlite(cached)', 'better-sqlite3'];
  const rows = QUERIES.map((query) => {
    const nodeQuery = byDriver['node:sqlite'].queries.find((entry) => entry.sql === query.sql);
    const cachedQuery = byDriver['node:sqlite(cached)'].queries.find((entry) => entry.sql === query.sql);
    const betterQuery = byDriver['better-sqlite3'].queries.find((entry) => entry.sql === query.sql);

    return [
      query.sql,
      formatMs(nodeQuery.summary.avgMs),
      formatMs(cachedQuery.summary.avgMs),
      formatMs(betterQuery.summary.avgMs),
    ];
  });

  printTable(headers, rows);
};

const main = () => {
  assertPreconditions();
  printResults([
    benchmarkNodeSqlite(),
    benchmarkCached(),
    benchmarkBetterSqlite3(),
  ]);
};

main();
