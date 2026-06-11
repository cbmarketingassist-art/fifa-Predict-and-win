# FIFA Predictor - Team Links & Info

Welcome to the FIFA Predictor app project! Here is a quick reference guide for the team.

## Important Links

- **Main Application (Live URL):** [https://fifa-predictor-theta.vercel.app](https://fifa-predictor-theta.vercel.app)
- **Admin Dashboard:** [https://fifa-predictor-theta.vercel.app/admin.html](https://fifa-predictor-theta.vercel.app/admin.html)
- **GitHub Repository:** [https://github.com/cbmarketingassist-art/fifa-Predict-and-win](https://github.com/cbmarketingassist-art/fifa-Predict-and-win)
- **Google Sheet (Data Sync):** [FIFA Predictor Google Sheet](https://docs.google.com/spreadsheets/d/1OqlIfPvfcbXMoDlmWYDbjnynMT1Xca6yKOVw9jt3dCc/edit?usp=sharing)

## Admin Access

- **Admin Passcode:** `4321` 
  *(Note: This is the default passcode. If you have set the `ADMIN_PASSCODE` environment variable in Vercel, use that instead.)*

## Environment Variables
If you are deploying or running locally, make sure the following environment variables are set in your Vercel project or `.env` file:
- `UPSTASH_REDIS_REST_URL` (Required for database)
- `UPSTASH_REDIS_REST_TOKEN` (Required for database)
- `ADMIN_PASSCODE` (Optional, defaults to 4321)
- `GOOGLE_SHEET_WEBHOOK` (Optional, used to sync signups and predictions)
