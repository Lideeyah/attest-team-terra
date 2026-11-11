# Backend provenance

Imported from `origin/raheem/backend-spec-alignment-frontend-handoff`, commit
`ccc44d07c8b199edbfe4d0f6906db4e887dabf9d`, into `backend/` on `mark/production`.
The service keeps its own package lock, build, migrations and local state.
External providers in `npm run backend:local` are mocked; PostGIS and API state persist.
