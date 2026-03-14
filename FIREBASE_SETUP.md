# ICU Command Center — Firebase Setup Guide

Before deploying, you need to connect the app to Firebase (free).
This takes about 10 minutes and only needs to be done once.

---

## STEP 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it anything e.g. `icu-dashboard`
4. Disable Google Analytics (not needed) → click **"Create project"**
5. Wait for it to finish, then click **"Continue"**

---

## STEP 2 — Create a Web App

1. On the project homepage, click the **"</>"** (Web) icon
2. Give it a nickname e.g. `icu-web`
3. Do NOT check "Firebase Hosting"
4. Click **"Register app"**
5. You will see a block of code like this:

```
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "icu-dashboard.firebaseapp.com",
  projectId: "icu-dashboard",
  storageBucket: "icu-dashboard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. **Copy all of that** — you will paste it in Step 4 below

---

## STEP 3 — Enable Firestore Database

1. In the left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** → click **"Next"**
4. Choose any location (closest to Kuwait: `europe-west1`) → click **"Enable"**

---

## STEP 4 — Add Your Config to the App

1. Open the file: `src/utils/firebase.js`
2. Find this section near the top:

```js
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
};
```

3. Replace everything inside the `{}` with your copied config from Step 2
4. Save the file

---

## STEP 5 — Upload to GitHub & Deploy

1. Upload all files to your GitHub repository (same as before)
2. Netlify will auto-rebuild within 60 seconds
3. Done — the viewer app on any phone will now update in real time

---

## How It Works Now

| Action | Result |
|--------|--------|
| Admin clicks "Save & Publish" | Data is saved to Firebase cloud |
| Viewer opens app on iPhone | Reads from Firebase — updates instantly |
| Admin changes assignments | Changes appear on all viewer phones within seconds |

---

## Security Note

The Firestore "test mode" allows open read/write for 30 days.
After 30 days, go to Firestore → Rules and paste this to keep it working:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
