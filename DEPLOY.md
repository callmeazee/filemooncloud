## Filemoon — Google Cloud Run Deployment
## Run this script from PowerShell inside the project folder

## ─── STEP 1: Install gcloud CLI (if not installed) ───────────────────────────
## Download from: https://cloud.google.com/sdk/docs/install
## After install, open a new terminal and run: gcloud init

## ─── STEP 2: Authenticate ─────────────────────────────────────────────────────
## gcloud auth login

## ─── STEP 3: Deploy (copy-paste this entire block) ───────────────────────────

gcloud run deploy filemoon-app `
  --source . `
  --region europe-west1 `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 3 `
  --set-env-vars "DB=mongodb+srv://spray2026_db_user:kBhvA8r4y6yhoZcp@cohort.pdzag0u.mongodb.net/filemoon,SECRET_KEY=8dcdfcceb30f3c07585e0a8e7cb3eae3bdee245ce1b0f58df9f956ec4ad23a45,SMTP_EMAIL=developerazee@gmail.com,SMTP_PASSWORD=ywhrgcaztqrwwanr,DOMAIN=PASTE_YOUR_CLOUD_RUN_URL_HERE"

## ─── STEP 4: After deploy finishes ───────────────────────────────────────────
## 1. Copy the URL it gives you (looks like: https://filemoon-app-xxxx-ew.a.run.app)
## 2. Run this command to set the correct DOMAIN so email share links work:
##
## gcloud run services update filemoon-app `
##   --region europe-west1 `
##   --update-env-vars "DOMAIN=https://filemoon-app-xxxx-ew.a.run.app"
