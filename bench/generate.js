#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function parseArgs(argv) {
  const options = {
    out: path.resolve(process.cwd(), 'bench.db'),
    rows: 100_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--out') {
      options.out = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--rows') {
      options.rows = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
  }

  if (!Number.isInteger(options.rows) || options.rows <= 0) {
    throw new Error('--rows must be a positive integer');
  }

  return options;
}

function makeRow(id) {
  return {
    id,
    emailAddress: `user${id}@example.com`,
    firstName: `First${id % 10_000}`,
    lastName: `Last${(id * 7) % 10_000}`,
    ipAddress: `10.${id % 256}.${Math.floor(id / 256) % 256}.${Math.floor(id / 65_536) % 256}`,
    age: 18 + (id % 73),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (fs.existsSync(options.out)) {
    fs.rmSync(options.out);
  }

  fs.mkdirSync(path.dirname(options.out), { recursive: true });

  const db = new DatabaseSync(options.out);

  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      DROP TABLE IF EXISTS data;
      CREATE TABLE data (
        id INTEGER PRIMARY KEY,
        emailAddress TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        ipAddress TEXT NOT NULL,
        age INTEGER NOT NULL
      );
      CREATE INDEX idx_data_email_address ON data(emailAddress);
      CREATE INDEX idx_data_age ON data(age);
    `);

    const insert = db.prepare(`
      INSERT INTO data (
        id,
        emailAddress,
        firstName,
        lastName,
        ipAddress,
        age
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const batchSize = 1_000;
    for (let startId = 1; startId <= options.rows; startId += batchSize) {
      const endId = Math.min(startId + batchSize - 1, options.rows);
      db.exec('BEGIN');
      for (let id = startId; id <= endId; id += 1) {
        const row = makeRow(id);
        insert.run(
          row.id,
          row.emailAddress,
          row.firstName,
          row.lastName,
          row.ipAddress,
          row.age
        );
      }
      db.exec('COMMIT');
    }

    console.log(`Created ${options.out} with ${options.rows} rows.`);
  } finally {
    db.close();
  }
}

main();
