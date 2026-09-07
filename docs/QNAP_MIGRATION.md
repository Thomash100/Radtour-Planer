# QNAP migration — RAD-QNAP-20260907

## Scope and baseline

Move the existing deployment from Raspberry Pi `192.168.178.98` to QNAP
`192.168.178.105:3000`. Source baseline: private branch commit
`76fbececb50b5aaeff6fef51acb743469d0d3518`; integration branch:
`codex/qnap-migration`. This slice adds deployment configuration and these
instructions only. Application behavior and database schema remain at baseline.
No merge, tag, or GitHub publication is included in this slice.

Reuse check: `Dockerfile.rpi` already builds the application and worker;
`docker-compose.rpi.yml` supplies the service and provider configuration. The
QNAP compose reuses both designs, changes the host binding and build context,
requires a password, keeps database/cache ports internal, and starts Next.js
directly so `scripts/start-production.sh` cannot run automatic schema push/seed.
The worker also starts directly with `npm run worker`, using the existing
healthy PostgreSQL/Redis dependencies and ioredis reconnect behavior. This
avoids the baseline wait script's CRLF shell error without changing the image.

## Intended QNAP layout

```text
/share/Container/radtour-planer/
  docker-compose.qnap.yml
  .env                       # deployment-only secrets; restricted permissions
  source/                    # clean git archive of the exact baseline
    Dockerfile.rpi
    .dockerignore            # migration addition copied into archive
    ...
  backups/                   # source dump and restore evidence, outside build
```

Use Compose project name `radtour-planer` consistently. PostgreSQL and Redis use
the project's named persistent volumes. The `source` directory is a clean git
archive, not a copy of an existing working directory. Office files, secrets,
Git metadata and build artifacts are excluded by `.dockerignore` as an
additional guard. App and worker share `radtour-planer-qnap:76fbece`.

Set `POSTGRES_USER`, `POSTGRES_DB`, and a strong, nonempty `POSTGRES_PASSWORD`
in the deployment `.env`. Use a random hexadecimal password because the same
value is embedded in `DATABASE_URL`; arbitrary URI-reserved characters require
encoding that this minimal compose does not perform. Set
`NEXT_PUBLIC_APP_URL=http://192.168.178.105:3000` before the build. Carry the Pi's
explicit routing, geocoding and accommodation settings into the deployment
environment. Compose defaults match the Pi configuration; they do not establish
new provider availability guarantees. Do not print or commit `.env`.

## Backup and restore sequence

1. Preserve the Pi deployment and record its image/source version, environment
   names, PostgreSQL/PostGIS versions, database tables/counts, and Redis queue
   state. Arrange a write-free final backup window; avoid active tour edits or
   queued jobs during capture. Do not run both workers against copied jobs.
2. Create a PostgreSQL custom archive on the Pi using its existing PostgreSQL
   container: `pg_dump -U <user> -d <database> --format=custom --no-owner
   --no-acl -f /tmp/radtour-planer.dump`. Copy the archive out using `docker cp`,
   then transfer it to QNAP `backups/`; record and compare SHA-256 checksums.
   Use a file path or binary-safe transfer, not PowerShell text redirection.
3. From the QNAP deployment directory, run
   `docker compose -p radtour-planer -f docker-compose.qnap.yml up -d postgres redis`.
   Keep app and worker stopped until restore has passed. The database image
   matches the source: `imresamu/postgis:16-3.4-alpine3.21` (source PostGIS 3.4.4).
4. Restore into the fresh target database using `pg_restore --clean --if-exists
   --exit-on-error --no-owner --no-acl -U <user> -d <database>
   /tmp/radtour-planer.dump` inside
   the PostgreSQL container after copying the archive into it. Validate the
   archive listing and restore exit status. If the image created an empty
   PostGIS extension first, handle that explicitly before restore; do not
   dismiss restore errors. The clean flags replace target objects and must be
   used only on the newly provisioned QNAP database. Never use them on the Pi.
5. Compare table counts, extension versions and representative records with
   the source. Redis persistence on QNAP uses AOF and a named volume. Decide
   from the recorded source state whether pending Redis jobs require a
   separate transfer; PostgreSQL backup does not include them.
6. Build and check the image, then start app and worker with the same Compose
   project. Verify health, readiness, logs, database access and browser flows.

## Browser data and rollback

Browser-local tours/settings belong to the old origin and are not included in
`pg_dump`. Preserve each used browser/profile's data before switching address.
Use available application export/import functions and, where necessary, a
verified backup/transfer of the exact application storage keys. A GPX export
alone must not be treated as a full TourState backup. Check saved tours,
overnight selections and rider/bicycle profiles at the new origin. Keep the old
browser data until comparison succeeds.

Keep the Pi application and its database intact until acceptance. Rollback is
to stop QNAP app/worker and reopen the Pi address. Data created on QNAP after
cutover must first be backed up and reconciled; it will not appear on the Pi
automatically. Do not remove named volumes or run `down -v` during migration.

## Validation and manual checkpoint

Required evidence: Compose validation; mandatory-password failure check;
`git diff --check`; lint; typecheck; image build; database restore result and
comparisons; all service health checks; routing and saved-tour smoke checks;
verified browser data transfer. The parent operator runs NAS checks and records
actual results in `QNAP_MIGRATION_RESULT.md`. This document is the procedure;
the result document distinguishes completed checks from open acceptance work.

Acceptance: the same application baseline runs on QNAP, restored server data
matches the source, expected browser tours/settings are available, and the Pi
remains usable for rollback. Manual checkpoint: open the QNAP address in the
normal browser, load a saved tour, inspect stages and accommodations, and
confirm the rider profile before retiring the old service. Independent review
and user merge approval remain separate from this configuration handoff.
