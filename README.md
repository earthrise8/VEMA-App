<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9e446d6a-b49b-4b6e-ba0c-9664b1d9923c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Optionally set `GEMINI_MODEL` in [.env.local](.env.local) if you want to override the default backend model.
4. Start the Gemini API server:
   `npm run server`
5. Run the app in a second terminal:
   `npm run dev`

### Gemini setup

The frontend no longer talks to Gemini directly. It calls a backend endpoint at `/api/analyze`, which keeps your API key off the client bundle.

If you deploy the backend on a separate host, set `VITE_API_BASE_URL` in [.env.local](.env.local) to that URL.

## Firestore Setup (Required For Data To Load)

If pages like Recent Scans, Communications, or Symptoms stay empty/loading, it usually means Firestore is not fully configured yet.

### 1) Create Firestore database

1. Open Firebase Console for project `vema-79202`.
2. Go to **Firestore Database** and click **Create database**.
3. Use **Production mode** and pick your region.

### 2) Enable Authentication

1. Go to **Authentication** > **Sign-in method**.
2. Enable **Google** provider.
3. Add your app domain(s) to authorized domains.

### 3) Deploy rules and indexes

This repo includes:
- `firestore.rules`
- `firestore.indexes.json`

Deploy both with Firebase CLI:

1. `npm install -g firebase-tools`
2. `firebase login`
3. `firebase use vema-79202`
4. `firebase deploy --only firestore:rules,firestore:indexes`

### 4) Seed required data

The Communications page reads from `experts`. Non-admin users cannot write experts by rule, so create at least one expert document manually in Firestore Console:

Collection: `experts`
- `name` (string)
- `specialty` (string)
- `rating` (number)
- `reviewCount` (number)
- `bio` (string)
- `photoUrl` (string)
- `pricingPlan` (string)

## Deploy to GitHub Pages

This project is configured for GitHub Pages using GitHub Actions.

### What is configured

1. `HashRouter` is used for client-side routing so refreshes and deep links do not break on static hosting.
2. Vite uses a repo-aware `base` path during Pages builds.
3. A workflow in `.github/workflows/deploy-pages.yml` builds and deploys `dist` to GitHub Pages.

### One-time repository setup

1. Push this repository to GitHub.
2. In GitHub, open repository **Settings** > **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Ensure your default branch is `main` (or update the workflow branch trigger).

### Deploy

1. Push to `main`.
2. Wait for the **Deploy Vite app to GitHub Pages** workflow to succeed.
3. Open your site at:
   `https://<github-username>.github.io/<repo-name>/#/`

### Notes

1. Local development is unchanged: `npm run dev`.
2. If your repo name changes, deployment still works because the workflow reads `GITHUB_REPOSITORY`.
