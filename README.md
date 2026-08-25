# Language Learning AI Frontend

Minimal React and Vite PWA for the Language Learning AI application.

## Run locally

Node.js 22 or newer is required.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Enter language-learning context in the text area and select **Generate response**.
The app posts `{"context": {"text": "..."}}` to the FastAPI backend configured
through `VITE_API_BASE_URL` and displays the Azure OpenAI response above the text
area.

## Deployment

Pull requests to `main` run a production build. Merges to `main` deploy `dist/`
to the `language-learning-ai-web-evth` Azure Static Web App using the
`AZURE_STATIC_WEB_APPS_API_TOKEN` GitHub environment secret.
