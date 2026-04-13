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
3. Run the app:
   `npm run dev`

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
