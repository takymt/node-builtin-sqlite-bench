# node-builtin-sqlite-bench

Simple benchmarks for comparing `node:sqlite` and `better-sqlite3`.

Assumptions:

- Node.js: [`v25.7.0`](https://github.com/nodejs/node/tree/v25.7.0)
- better-sqlite3: [`v12.6.2`](https://github.com/WiseLibs/better-sqlite3/tree/v12.6.2)

> [!NOTE]
> Results vary by machine, OS, filesystem, and cache state.

## Bench

```
Driver          Query         Avg ms  Median ms  Min ms  Max ms
--------------  ------------  ------  ---------  ------  ------
node:sqlite     point_lookup  0.005   0.003      0.003   0.013
node:sqlite     limit_10      0.008   0.008      0.007   0.009
node:sqlite     limit_1000    0.549   0.536      0.414   0.764
node:sqlite     scan_all      148.3   137.7      129.3   196.3
better-sqlite3  point_lookup  0.003   0.002      0.002   0.010
better-sqlite3  limit_10      0.005   0.005      0.005   0.005
better-sqlite3  limit_1000    0.292   0.282      0.275   0.374
better-sqlite3  scan_all      103.4   99.69      98.56   137.2
```

## Queries

- `SELECT * FROM data WHERE id = ?`
- `SELECT * FROM data LIMIT 10`
- `SELECT * FROM data LIMIT 1000`
- `SELECT * FROM data`

## Scripts

Install dependencies:

```bash
pnpm install
```

Generate a database:

```bash
pnpm run db:generate

# or a larger database
pnpm run db:generate:large
```

Run the benchmark:

```bash
pnpm run bench
```

## Author

@takymt (a.k.a tarte)

## LISENCE

[MIT License](./LICENSE)