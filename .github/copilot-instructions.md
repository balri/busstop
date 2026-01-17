# Copilot Instructions for busstop

This guide enables AI coding agents to be productive in the `busstop` codebase. It summarizes architecture, workflows, and conventions unique to this project.

## Architecture Overview

- **Main app**: Core logic is in `src/`, with subfolders for filtering (`src/filter/`), routing (`src/routes/`), and a separate `bacon` backend (`src/bacon/`).
- **Data flow**: GTFS transit data is processed via scripts and TypeScript modules, then served via a Node.js backend. The frontend is in `public/`.
- **Feeds**: GTFS feeds are downloaded and updated using scripts and TypeScript commands. See `src/filter/index.ts` for feed update logic.
- **Bacon backend**: `src/bacon/` is a copied backend for another app, serving endpoints for actor/movie data. It is not directly related to bus stop logic.

## Key Workflows

- **Start server**: Run `node backend/index.js` (if present) or use scripts in `scripts/`.
- **Update GTFS feed**: `npx ts-node src/filter/index.ts` processes and updates transit data.
- **Screenshots**: Use Puppeteer via `node scripts/screenshot.js` to take site screenshots (hourly or every 10min).
- **Linting**: `npm run lint` for code style checks.
- **Dependency check**: `npx depcheck` for unused dependencies.
- **Unused exports**: Install `ts-prune` globally, then run `ts-prune` to find unused TypeScript exports.

## Project Conventions

- **Config values**: Defaults like `ACCEPTABLE_DELAY`, `MIN_DISTANCE`, and `SECRET_KEYWORD` are set in environment or config files.
- **TypeScript**: Most business logic is in `.ts` files under `src/`. Tests are in files ending `.test.ts`.
- **Scripts**: Automation and utility scripts are in `scripts/`.
- **Frontend**: Static assets and entry points are in `public/`.

## Integration Points

- **External feeds**: GTFS data from TransLink (see README for URL).
- **Uptime monitoring**: UptimeRobot dashboard is referenced for service health.
- **Bacon API**: Endpoints for actor/movie data (see `src/bacon/README.md`).

## Examples

- Update feed: `npx ts-node src/filter/index.ts`
- Screenshot: `node scripts/screenshot.js`
- Bacon API: `http://localhost:3000/bacon/api/random-actor`

## References

- See `README.md` for workflow commands and config values.
- See `src/bacon/README.md` for Bacon backend API usage.
- Key logic: `src/filter/`, `src/routes/`, `src/bacon/`

---

**Feedback requested:** Please review for missing or unclear sections. Suggest improvements for agent productivity.
