# node-builtin-sqlite-bench

Simple benchmark for comparing `node:sqlite` and `better-sqlite3`.

Assumptions:

- Node.js: [`v25.7.0`](https://github.com/nodejs/node/tree/v25.7.0)
- better-sqlite3: [`v12.6.2`](https://github.com/WiseLibs/better-sqlite3/tree/v12.6.2)

> [!NOTE]
> Results vary by machine, OS, filesystem, and cache state.

## Benchmark

Conditions: `200000` rows, `10` runs per query, average ms.

For details on the prepared statement cache, see [database.createTagStore](https://nodejs.org/api/sqlite.html#sqlite_database_createtagstore_maxsize)

```text
Query                            node:sqlite  node:sqlite(cached)  better-sqlite3
-------------------------------  -----------  -------------------  --------------
SELECT * FROM data WHERE id = ?  0.0072       0.0053               0.0021
SELECT * FROM data LIMIT 10      0.0083       0.0074               0.0047
SELECT * FROM data LIMIT 1000    0.5508       0.4210               0.3188
SELECT * FROM data               51.92        47.54                32.66
```

## Setup

```bash
pnpm install
pnpm run db:generate
pnpm run bench
```

## Author

@takymt (a.k.a tarte)

## LISENCE

[MIT License](./LICENSE)
