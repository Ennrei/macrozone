# MacroZone

> A nutrition journal that turns meal logs into daily macro totals, goal progress, and weekly patterns — without treating food like a pass/fail test.

## Group members

| Name | GitHub username |
| --- | --- |
| Add group member | `@username` |
| Add group member | `@username` |

## Concept and what it processes

MacroZone is a personal meal and nutrition insights app. A meal entry stores its name, meal category, calories, protein, carbohydrates, fat, date/time, notes, and favorite status. Each meal can reference the nutrition goal that was active when it was logged. Nutrition goals store daily macro targets and an activation state.

The app derives daily calorie and macro totals, remaining energy against the active goal, per-meal goal percentages, seven-day averages and activity, daily calendar totals, category distributions, and average nutrition for meals that have been logged repeatedly. Those calculations are returned by processing endpoints and displayed as summaries, progress bars, and charts; they are not duplicated in client state.

## Screenshots

Capture screenshots of the running app at desktop and 375px mobile widths before submission, then add them under `docs/screenshots/` and update these image links:

| Landing page | Nutrition dashboard |
| --- | --- |
| `docs/screenshots/landing.png` | `docs/screenshots/dashboard.png` |

The main views are available at `/` (landing page), `/dashboard`, `/meals`, `/analytics`, `/calendar`, `/targets`, and `/foods`.

## Features

- Landing page with product introduction and navigation into the app.
- Responsive React Router experience with ten routes: landing, dashboard, meal journal, create meal, meal details, edit meal, analytics, calendar, daily goals, and food insights.
- Create, view, edit, search, favorite, duplicate, and delete meals. Meal deletion requires confirmation.
- React Hook Form and Zod validation with field-level errors on the create/edit meal and goal forms.
- Daily calorie and macro totals, remaining calories, percentage-to-goal comparisons, seven-day averages, active logging days, calendar summaries, meal-category totals, and repeated-meal averages.
- Create and save multiple nutrition goals, activate one at a time, and protect the active goal from deletion.
- Visible loading, retryable API error, and empty states; create, update, and delete actions provide success/error feedback.
- Mongoose timestamps, field validation, related Meal and NutritionTarget collections, and sample data for an out-of-the-box database demo.
- Express request logging, CORS, JSON 404 handling, centralized validation/ID/database error responses, and an API health check.

## Technology

- **Client:** React, Vite, TypeScript, Tailwind CSS, React Router, React Hook Form, Zod, axios
- **Server:** Node.js, Express, Mongoose
- **Database:** MongoDB Atlas

The `client/` and `server/` workspaces are ready to be published as the group's separate client and server GitHub repositories. This checkout is a single local workspace; create the two GitHub repositories and push each workspace according to the instructor's submission process.

## Setup

### Requirements

- Node.js 20.19+ (or 22.12+) and npm
- A MongoDB Atlas cluster and database user

### Install and configure

From the project root:

```powershell
npm install
Copy-Item .env.example .env
```

Set these server environment variables in the root `.env` file:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `4000`. |
| `MONGO_URI` | Yes | MongoDB Atlas connection URI for the MacroZone database. |
| `CLIENT_ORIGIN` | No | Allowed browser origin; defaults to `http://localhost:5173`. |

Replace the sample Atlas username, password, and cluster host in `MONGO_URI`. Do not commit `.env`; `.env.example` is committed as a template.

### Seed and run

```powershell
npm run seed
npm run dev
```

The seed command creates one active nutrition target and ten sample meals only when the corresponding collections are empty. Existing data is left in place. The development command starts the API at `http://localhost:4000` and Vite at `http://localhost:5173`.

If the API is hosted at another address, set `VITE_API_URL` in `client/.env.local` (for example, `VITE_API_URL=http://localhost:4000/api`). All browser requests use the configured axios instance in `client/src/lib/api.ts`.

### Expo app

The Expo app in `firstactfinals/` connects to the same API and MongoDB data. Start the API from the project root with `npm run dev:server --workspace server`, then start Expo from `firstactfinals/` with `npm run web` or `npm start`. Copy `firstactfinals/.env.example` to `firstactfinals/.env` to override `EXPO_PUBLIC_API_URL`.

The default API URL works for web and the Android emulator. For a physical phone, set `EXPO_PUBLIC_API_URL` to the computer's LAN address, such as `http://192.168.1.20:4000/api`, and restart Expo. Make sure the phone and computer share a network and the firewall allows port 4000. Expo web at `http://localhost:8081` is allowed by the API's development CORS configuration.

The API has no accounts or per-device isolation: records are shared by every client connected to the same database. Existing device-only Expo data is retained and synchronized to the backend when it is reachable. If the API is offline, edits remain in device storage and queue for synchronization; use **Retry sync**, reopen the app, or make another change after the backend is back online to flush the queue.

Production client build:

```powershell
npm run build
```

## REST API

All endpoints are prefixed with `/api`. Successful responses use a `data` property; collection responses also include `count` where applicable. Errors consistently return `{ "message": "..." }`. Invalid IDs and Mongoose validation failures return `400`; missing records return `404`.

Expo synchronization includes an optional stable `clientId` on meal and target writes. Those writes upsert by `clientId`, making queued retries safe if a device temporarily loses its connection after the server has accepted a change. These are shared database records; the API currently has no authentication or user-specific data isolation.

| Method | Path | Purpose | Sample request | Sample response |
| --- | --- | --- | --- | --- |
| GET | `/health` | API health check | — | `{ "status": "ok" }` |
| GET | `/meals` | List meals; supports `q`, `category`, `favorite`, `from`, and `to` filters | `?category=lunch` | `{ "data": [{ "_id": "...", "name": "Salmon grain bowl" }], "count": 1 }` |
| GET | `/meals/search?q=salmon` | Search meal name, category, or notes | Query `q=salmon` | `{ "data": [{ "name": "Salmon grain bowl" }], "count": 1, "query": "salmon" }` |
| GET | `/meals/:id` | Get one meal and its linked goal | — | `{ "data": { "_id": "...", "name": "Salmon grain bowl" } }` |
| POST | `/meals` | Create a meal | `{ "name": "Oat bowl", "category": "breakfast", "calories": 420, "protein": 24, "carbs": 58, "fat": 11, "loggedAt": "2026-10-11T08:00:00.000Z" }` | `201 { "data": { "_id": "...", "name": "Oat bowl" }, "message": "Meal created" }` |
| PATCH | `/meals/:id` | Update a meal | `{ "calories": 450 }` | `{ "data": { "_id": "...", "calories": 450 }, "message": "Meal updated" }` |
| DELETE | `/meals/:id` | Delete one meal | — | `{ "data": { "id": "..." }, "message": "Meal deleted" }` |
| DELETE | `/meals/clear` | Clear the meal journal | — | `{ "data": { "deleted": 10 }, "message": "Meal log cleared" }` |
| PATCH | `/meals/:id/favorite` | Toggle a meal's favorite status | — | `{ "data": { "favorite": true }, "message": "Meal saved to favorites" }` |
| POST | `/meals/:id/duplicate` | Add a copy of a meal with the current date/time | — | `201 { "data": { "_id": "...", "name": "Oat bowl" }, "message": "Meal duplicated for today" }` |
| GET | `/meals/:id/goal-progress` | Compare a meal with its linked/active daily goal | — | `{ "data": { "progress": { "calories": 21, "protein": 16 } } }` |
| GET | `/meals/stats/today` | Derive today's totals and remaining calories | — | `{ "data": { "totals": { "calories": 930, "protein": 51, "carbs": 100, "fat": 37 }, "remainingCalories": 1070 } }` |
| GET | `/meals/stats/weekly` | Derive seven daily totals and calorie average | — | `{ "data": [{ "date": "2026-10-11", "calories": 930, "meals": 2 }] }` |
| GET | `/meals/stats/macros` | Aggregate macros for a date range (optional `from`/`to`) | `?from=2026-10-01&to=2026-10-11` | `{ "data": { "calories": 5420, "protein": 310, "carbs": 590, "fat": 192, "count": 8 } }` |
| GET | `/meals/stats/calendar` | Sum calories and meals for each logged date in a month | `?month=10&year=2026` | `{ "data": [{ "date": "2026-10-11", "calories": 930, "meals": 2 }] }` |
| GET | `/meals/stats/categories` | Rank meal categories by logged energy | — | `{ "data": [{ "category": "lunch", "calories": 1520, "meals": 3, "protein": 109 }] }` |
| GET | `/meals/stats/foods` | Derive average macros for repeated meal names | — | `{ "data": [{ "id": "salmon grain bowl", "name": "Salmon grain bowl", "entries": 2, "calories": 640 }] }` |
| GET | `/targets` | List saved goals | — | `{ "data": [{ "_id": "...", "name": "Everyday balance", "active": true }], "count": 1 }` |
| GET | `/targets/current` | Get the active goal | — | `{ "data": { "_id": "...", "calories": 2000, "active": true } }` |
| GET | `/targets/current/summary` | Derive today's consumed totals and goal percentages | — | `{ "data": { "totals": { "calories": 930 }, "percentages": { "calories": 47 } } }` |
| GET | `/targets/:id` | Get one saved goal | — | `{ "data": { "_id": "...", "name": "Everyday balance" } }` |
| POST | `/targets` | Create a saved goal (inactive until activated) | `{ "name": "Training day", "calories": 2300, "protein": 170, "carbs": 270, "fat": 70 }` | `201 { "data": { "_id": "...", "active": false }, "message": "Target created; activate it to use it for progress" }` |
| PATCH | `/targets/:id` | Update a goal; setting `active: true` activates it | `{ "protein": 165 }` | `{ "data": { "_id": "...", "protein": 165 }, "message": "Nutrition target updated" }` |
| DELETE | `/targets/:id` | Delete an inactive goal; unlink meals first | — | `{ "data": { "id": "..." }, "message": "Nutrition target deleted" }` |
| POST | `/targets/:id/activate` | Activate a goal and deactivate the previous one | — | `{ "data": { "_id": "...", "active": true }, "message": "Nutrition target activated" }` |
| GET | `/targets/:id/progress` | Derive consumed, remaining, and percentage values for each macro | — | `{ "data": { "calories": { "consumed": 930, "target": 2000, "remaining": 1070, "percent": 47 } } }` |

Meal categories are `breakfast`, `lunch`, `dinner`, and `snack`. Meal nutrition values are non-negative and bounded; target values have per-nutrient limits. Both collections use Mongoose timestamps.

## Known limitations

- The current app is a single personal workspace with no accounts or authentication; meal and goal data is shared through the configured database.
- Nutrition values are entered by the user and are estimates, not medical advice or an external food-database lookup.
- The week and daily summaries use UTC date boundaries in the API; users in other time zones may see a day boundary that differs from their local midnight.
- Screenshots and group-member names/usernames must be added by the group before submission.
- Publish `client/` and `server/` as the two required GitHub repositories and ensure each member contributes meaningful commits from their own account.
