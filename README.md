<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/10beafeb-a3b5-4329-b3f7-a33e2d9d5208

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## GitHub / Hosting

1. Upload all files in this folder to a GitHub repository (do not upload `node_modules` or `dist`).
2. Deploy with **Vercel** or **Netlify** → "Import from GitHub". Build command: `npm run build`, output folder: `dist`. Settings files (`vercel.json`, `netlify.toml`) are included.
3. Local run: `npm install` then `npm run dev`.
