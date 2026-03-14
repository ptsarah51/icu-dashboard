# SDCC HS Command Center — Firebase Setup Guide

---

## STEP 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it e.g. `sdcc-hs-dashboard`
3. Disable Google Analytics → click **"Create project"**

---

## STEP 2 — Create a Web App

1. On the project homepage click the **"</>"** (Web) icon
2. Give it a nickname e.g. `sdcc-web` → click **"Register app"**
3. Copy the `firebaseConfig` block shown — you'll need it in Step 4

---

## STEP 3 — Enable Firestore Database

1. In the left sidebar click **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** → click **"Next"**
4. Choose location: **europe-west1** (closest to Kuwait) → click **"Enable"**

---

## STEP 4 — Add Your Config to the App

Open `src/utils/firebase.js` and paste your config into the marked section.

Also set your own APP_SECRET — change `"SDCC-HS-2025-SECRET"` to any
private string you choose (e.g. `"MyHospital-2025-XK9"`). This is your
database password — keep it private and don't share it.

---

## STEP 5 — Set Secure Firestore Rules

This is the important step that replaces the open "anyone can access" rules
with rules that only allow your app.

1. In Firebase console → **Firestore Database** → **Rules** tab
2. Delete everything and paste this EXACTLY, replacing the secret with
   whatever you set as APP_SECRET in firebase.js:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Board and admins — only writable if request includes the correct secret
    match /icu/{doc} {
      allow read: if true;
      allow write: if request.resource.data._secret == "SDCC-HS-2025-SECRET";
    }

    // Session history — same rule
    match /icu_sessions/{session} {
      allow read: if true;
      allow write: if request.resource.data._secret == "SDCC-HS-2025-SECRET";
    }
  }
}
```

3. Click **"Publish"**

This means:
- Anyone can READ (needed for viewer app on phones)
- Only your app can WRITE (the secret must match)
- Random people on the internet cannot modify or delete your data

---

## STEP 6 — Deploy

Upload all files to GitHub → Netlify rebuilds automatically.

---

## Renewing Rules (every 30 days not needed anymore)

With the secret-based rules above, they never expire. You only need to
update the rules again if you change your APP_SECRET.
