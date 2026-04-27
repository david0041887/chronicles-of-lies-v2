# Database Backup & Restore

Production data lives in **Railway PostgreSQL** (server version 18.3).
Railway's free / Hobby tier does **not** include automatic backups, so we
maintain our own.

## Three layers of backup

| Layer | Where | When | Retention |
|---|---|---|---|
| **Local manual** | `./backups/` (in OneDrive folder, auto-synced) | On-demand via `npm run db:backup` | Last 14 dumps (configurable via `BACKUP_RETAIN`) |
| **GitHub Actions daily** | Workflow artifacts on this repo | 03:00 UTC daily + manual dispatch | 90 days (configurable via repo var `BACKUP_RETENTION_DAYS`) |
| **Source code** | git remote (`origin`) | On every commit | Forever |

## One-time setup for the daily auto-backup

The workflow at `.github/workflows/db-backup.yml` needs **one secret**:

1. Get the Postgres public URL:
   ```bash
   npx --yes @railway/cli run --service Postgres -- printenv DATABASE_PUBLIC_URL
   ```
2. On GitHub: **Settings → Secrets and variables → Actions →
   New repository secret**
   - Name: `DATABASE_URL`
   - Value: paste the `postgresql://...` URL
3. (Optional) Adjust retention via repo variable `BACKUP_RETENTION_DAYS`
   (defaults to 90).

After that the workflow runs daily; you can also trigger it manually from
the **Actions** tab → DB Backup → Run workflow.

## Run a backup right now (locally)

```bash
npm run db:backup
```

Requires Docker Desktop running and the Railway CLI logged in
(`npx @railway/cli login`). Three files land in `./backups/` per run:

| File | Format | Use |
|---|---|---|
| `chronicles-YYYYMMDD-HHMMSS.dump` | Postgres custom (binary, gzip-9) | Fastest, smallest, **preferred restore source** |
| `chronicles-...-schema.sql` | Plain SQL, schema only | Human-readable, quick reference |
| `chronicles-...-data.sql` | Plain SQL, schema + data | Human-readable, fallback restore |

## Restoring a backup

### Best — into a fresh Railway/local Postgres

```bash
# 1. Provision a fresh DB (Railway → Add service → PostgreSQL).
# 2. Get its DATABASE_URL.

DB_URL="postgresql://user:pass@host:5432/dbname"

# 3. Restore the custom dump (recommended).
docker run --rm -i postgres:18-alpine \
  pg_restore --no-owner --no-acl --clean --if-exists -d "$DB_URL" \
  < backups/chronicles-YYYYMMDD-HHMMSS.dump
```

`--clean --if-exists` drops existing tables before restoring, so this is a
safe rerun against a partially-restored database. Omit `--clean` if you
want to error on conflict instead.

### Fallback — plain SQL via psql

```bash
docker run --rm -i postgres:18-alpine \
  psql "$DB_URL" < backups/chronicles-YYYYMMDD-HHMMSS-data.sql
```

### Just inspect the schema

```bash
less backups/chronicles-YYYYMMDD-HHMMSS-schema.sql
```

## Verifying a dump is intact

```bash
# Should print "PostgreSQL custom database dump"
file backups/chronicles-YYYYMMDD-HHMMSS.dump

# Should list every table in the dump
docker run --rm -v "$PWD/backups:/b" postgres:18-alpine \
  pg_restore --list /b/chronicles-YYYYMMDD-HHMMSS.dump | head -40
```

## Security notes

- `backups/` is `.gitignore`d. **Never** commit dump files — they contain
  real user data, including hashed passwords (bcrypt) and HMAC ticket keys.
- The `DATABASE_URL` GitHub secret is encrypted at rest and only exposed
  to the backup workflow runner.
- If you suspect the public URL has leaked, rotate the Postgres password
  in Railway (**Postgres service → Variables → reset POSTGRES_PASSWORD**)
  and update both the GitHub secret and any local `.env`.

## Recovery drill (recommended monthly)

1. Pick the most recent dump.
2. Provision a throwaway local Postgres via Docker:
   ```bash
   docker run -d --name pg-restore-test \
     -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:18-alpine
   ```
3. Restore into it (see above) using
   `postgresql://postgres:test@localhost:55432/postgres` as the URL.
4. Connect with Prisma Studio or psql and spot-check a few rows.
5. `docker rm -f pg-restore-test` when done.

If this works, your production backup is real. If it doesn't, fix the
backup before you need it.
