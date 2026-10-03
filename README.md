# Meal Picker For You

Thai recipe picker built with React, Vite, Tailwind, Express, and Turso/libSQL.
The frontend and API deploy together on Vercel; Turso stores menus in all categories.

## Dev Branch

New interface and menu-management changes are on `dev`. Keep Vercel's Production
Branch set to `master` until local testing is complete. Automatic deployments
from `dev` are disabled in `vercel.json` using Vercel's
[branch deployment setting](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled).
Use a separate Preview
database or leave Preview deployments disconnected from the production database.
Do not reuse production Turso credentials while testing deletion.

All three categories support adding, editing, deleting, searching, and tag-based
randomization. Writes require `RECIPE_PASSWORD`; it is sent in JSON so Thai
passwords work. Passwords are not stored with menus or in browser storage.
The interface uses self-hosted Kanit fonts and small transparent food illustrations.
Each category rotates through five artwork choices, avoiding immediate repeats.
List thumbnails follow menu types; the result's artwork is decorative category art,
not an exact dish photo. Artwork generation notes are in `public/ARTWORK.md`.
The searchable menu list expands/collapses smoothly and marks the selected menu.
Reduced-motion preferences disable list/result animations and the shuffle delay.
The pink-and-white tartan backdrop drifts slowly and has a pause control. Music is
off on page load and starts only from its header toggle. It uses an original
eight-bar cooking-game-style tune synthesized locally with Web Audio, not the
Cooking Mama soundtrack. It stops when the tab is hidden and never needs an
external audio download. No audio is autoplayed or fetched from third parties.
The first startup migrates existing home recipes into the shared menu library
and seeds food/snacks once. Deleted starter menus are not restored on restart.

## Local Development

Use Node.js 22 or newer. Run `npm install`, copy `.env.example` to `.env`,
set `RECIPE_PASSWORD`, and run `npm run dev`.

Open http://127.0.0.1:5173. The API runs on port 3001 via Vite's proxy.
`npm run dev` always uses the isolated `data/dev/recipes.sqlite` database and
ignores Turso credentials. Its default owner password is `local-preview-only`;
change it with `DEV_RECIPE_PASSWORD`. `DEV_DATA_DIR` can change the test directory.
`npm start` uses `data/recipes.sqlite` when Turso variables are blank.
The existing SQLite file remains compatible and is not deleted or reset.
To explicitly test a hosted database, use `npm start` with both Turso variables.

## Deploy on Vercel and Turso

1. Create a free Turso **libSQL** database and copy its database URL and auth token.
   The app uses the supported `@libsql/client` SDK. Choose a libSQL-compatible
   database rather than the newer Turso engine.
2. Import this Git repository into Vercel. The project uses the Vite preset,
   build command `npm run build`, output directory `dist`, and Node.js 22 or newer.
   `vercel.json` configures the build and `api/` contains Node functions.
3. Set these environment variables in Vercel before deploying:

| Variable | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | The hosted database URL (usually `libsql://...`) |
| `TURSO_AUTH_TOKEN` | A database token with read/write access |
| `RECIPE_PASSWORD` | A long private password for adding recipes |

Use Vercel's encrypted environment settings. Never add `VITE_` to these names,
put them in frontend code, or commit `.env`. Production and Preview environment
variables are configured separately: use a separate test database for previews
if you do not want preview writes to change production recipes.

4. Deploy. `/api/health` confirms the database connection and initialization.
   Eight starter recipes and 60 food/snack menus are seeded once on a new database.
   Existing home recipes are migrated without deleting the original table.
5. Open the home-cooking category and add a recipe using your owner password.
   Open the site on another device to confirm the saved recipe is shared.

No Render service or persistent disk is needed. Free plans have usage limits;
Vercel Hobby is for personal, non-commercial use. Keep paid upgrades and database
overages disabled if you want to stay on free plans.

References: [Vercel pricing](https://vercel.com/pricing),
[Turso pricing](https://turso.tech/pricing),
[Turso SDK](https://docs.turso.tech/sdk/ts/reference).

## Move Existing Recipes

Set the two Turso variables in your local `.env`, then run:

```sh
npm run db:import
```

This reads `data/recipes.sqlite` and copies recipes to Turso. To import a JSON
download from the old browser version or a different SQLite file:

```sh
npm run db:import -- path/to/my-saved-recipes.json
```

Imports validate all source recipes before copying. Existing names are skipped,
and the source file is preserved. Back up your recipes before changing hosting.

## Recipe Features

30 delivery menus, 30 snacks, and eight starter home recipes are included.
Home recipe quantities serve two; they are usage amounts, not Makro package sizes.
Common ingredients are used, but store availability and prices are not verified.
TikTok links open the original video; ingredients and steps are entered manually.
Public users can browse. Adding, editing, or deleting a menu requires the owner password, which is
not stored in the browser. Previously saved browser recipes can be downloaded
from the home-cooking view and imported using the command above.

## Verification

Run `npm test` for API authentication, validation, duplicates, and restart
persistence tests. Tests use temporary local databases and never connect to
Turso. Run `npm run build` to check the production frontend.

`npm start` serves the built frontend and API locally. Hosted Vercel functions
export the API without starting a port listener. There is no filesystem fallback
on Vercel: missing Turso credentials cause an error instead of temporary storage.
