# Language Learning AI Frontend

Minimal React and Vite PWA for the Language Learning AI application.

## Run locally

Node.js 22 or newer is required.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Enter language-learning context in the text area and select **Send**.
The app posts `{"context": {"text": "..."}}` to the FastAPI backend configured
through `VITE_API_BASE_URL` and displays the Azure OpenAI response above the text
area.

Set `VITE_GOOGLE_CLIENT_ID` to a Google OAuth web client ID. Users must sign in
with Google before using the chat. The frontend sends the Google ID token to the
API, which validates it server-side, and loads that authenticated user's stored
prompts. The token is kept only in browser session storage and is removed on sign
out.

## Deployment

Pull requests to `dev` or `main` run tests and a production build. Merges to
`dev` deploy a stable Static Web Apps branch preview connected to the staging
FastAPI Web App. Merges to `main` deploy production. Both deployments use the
`AZURE_STATIC_WEB_APPS_API_TOKEN` repository secret; `production_branch: main`
keeps the environments separate.
