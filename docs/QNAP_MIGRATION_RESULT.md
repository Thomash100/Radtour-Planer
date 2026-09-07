# QNAP migration result — 2026-09-07

Work order: `RAD-QNAP-20260907`. Application baseline:
`76fbececb50b5aaeff6fef51acb743469d0d3518`. Target:
`http://192.168.178.105:3000`. These runtime findings were reported by the
parent NAS operator `/root`; this configuration writer did not independently
rerun them and does not issue an independent release approval.

| Check | Reported result |
| --- | --- |
| Image build | Passed |
| Lint and typecheck | Passed |
| Tests | 152 passed |
| PostgreSQL custom archive restore | Exit 0 with `--clean --if-exists --no-owner --no-acl --exit-on-error` on the new QNAP database |
| Backup archive SHA-256 | `ca23209b580ddd7718c5a97812087d7b3f90f8c4d7c90c53daecd26907539506` |
| Extensions | All five match the source exactly |
| Database content | Content MD5 comparisons match for all ten tables; includes 111 Route and 954 RouteStage records |
| Application endpoints | All three checked endpoints return HTTP 200 |
| Initial worker startup | Failed: baseline `scripts/wait-for-services.sh` contains CRLF; shell reports `Illegal option -` |
| Worker correction | Passed after recreation with direct `npm run worker`; log: `BikeTripHub worker listening on queue bike-trip-jobs.` |
| Container health | All four `radtour-qnap` containers healthy |
| Routes API | `/api/routes` returns HTTP 200 with 111 routes and their stages |
| Browser smoke check | Home, GPX planner and tour management rendered in the operator's isolated in-app browser |

The worker correction only changes Compose. It does not require an image
rebuild or an application source change. The operational recheck of the
corrected worker passed.

Browser localStorage was inaccessible to the operator. Browser-local tours,
settings and rider profiles have therefore not been confirmed transferred.
The database comparison does not cover browser storage. Verification in each
normal browser/profile at the old and new origin remains open.
The isolated in-app browser displayed zero local tours, as expected for its
separate browser storage; this is not evidence that the user's tours are absent.

The old Pi is retained and has not been shut down. Do not retire it until
browser data and user workflows have been accepted.
See `QNAP_MIGRATION.md` for the preservation and rollback procedure. No commit,
merge, tag or publication was performed by this configuration slice.
