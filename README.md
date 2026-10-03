# Meal Picker For You

Thai recipe picker built with React, Vite, Tailwind, Express, and Turso/libSQL.
The frontend and API deploy together on Vercel; Turso stores shared recipes.

## Local Development

Use Node.js 22 or newer. Run `npm install`, copy `.env.example` to `.env`,
set `RECIPE_PASSWORD`, and run `npm run dev`.

Open http://127.0.0.1:5173. The API runs on port 3001 via Vite's proxy.
When the Turso variables are blank, recipes use `data/recipes.sqlite`.
The existing SQLite file remains compatible and is not deleted or reset.
Set both Turso variables locally to test against your hosted database instead.

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
   Eight starter recipes are inserted if their names do not already exist.
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
Public users can browse. Adding a recipe requires the owner password, which is
not stored in the browser. Previously saved browser recipes can be downloaded
from the home-cooking view and imported using the command above.

## Verification

Run `npm test` for API authentication, validation, duplicates, and restart
persistence tests. Tests use temporary local databases and never connect to
Turso. Run `npm run build` to check the production frontend.

`npm start` serves the built frontend and API locally. Hosted Vercel functions
export the API without starting a port listener. There is no filesystem fallback
on Vercel: missing Turso credentials cause an error instead of temporary storage.
