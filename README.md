# Shree Krishna Enterprises website

Static website for an authorized Waaree solar dealer, plus a private admin panel.
No backend server: browsers talk directly to Google Firebase, and
`ske/firestore.rules` decides who may read or write what.

```
ske/public-customer   Public website  -> Netlify (shreekrishnaenterprises.shop)
ske/public-admin      Admin panel     -> separate Netlify site
ske/firestore.rules   Database security rules -> Firebase project chating-45c19
tools/                Run before every deploy (not part of the website)
tools/testing/        Only for testing: local server, test database, rules tests
```

## How data flows

```
Admin panel --(login: Firebase Auth)--> Firestore <--(read catalogue)-- Website
                                            ^
                         Website forms -----+ (create leads only)
```

| Collection    | Written by     | Read by      | Holds |
|---------------|----------------|--------------|-------|
| `products`    | admins         | everyone     | product details, small preview photo (`cover`), list of `media` ids |
| `hero_slides` | admins         | everyone     | homepage banner: title, `cover`, `media` |
| `gallery`     | admins         | everyone     | caption, category, `cover`, `media` |
| `reviews`     | admins         | everyone     | name, rating, comment, small photo, verified flag |
| `media`       | admins         | everyone     | one full-size photo each; never edited, only added or deleted |
| `leads`       | anyone (create)| admins only  | enquiries from the website forms (personal data) |
| `admins`      | Firebase console only | own entry | the admin allow-list: document id = admin's user id |

Photos are stored in Firestore (Firebase Storage would need a paid plan). Lists
carry only small previews; full photos load when shown and are cached on the
visitor's device permanently.

## Run locally

Python 3 is all that is needed:

```bash
python3 tools/testing/dev_server.py ske/public-customer --port 8080
python3 tools/testing/dev_server.py ske/public-admin --port 8081
```

Open http://localhost:8080 and http://localhost:8081. The dev server applies the
same security headers as Netlify (`_headers`), so problems show up locally.

**These pages use the live database.** To test without touching it, use the
Firebase emulator (needs Node.js and Java). From `tools/testing`:

```bash
npm install
npm run emulators          # leave running
npm run seed               # copies the public catalogue, creates a test admin
```

Then open http://localhost:8080/?emulator and http://localhost:8081/?emulator
(test admin login is in `tools/testing/seed_emulator.py`). `?emulator=0` switches back.

Security rules tests (from `tools/testing`): `npm run test:rules`.

## Before every deploy

```bash
python3 tools/stamp_assets.py
```

This stamps each CSS/JS/font/image reference with a hash of the file (`?v=1a2b3c4d`).
Netlify then lets browsers cache those files for a year, and a changed file always
gets a new URL. Then run:

```bash
python3 tools/check_site.py
```

It fails on broken file references, placeholder content, wrong WhatsApp/phone
numbers, inline scripts the security policy would block, unsafe new-tab links,
and stale stamps.

## Deploy

1. **Website and admin:** publish `ske/public-customer` and `ske/public-admin` to
   their Netlify sites (Git deploy or drag-and-drop of the folder).
2. **Database rules:** paste `ske/firestore.rules` into Firebase console >
   Firestore Database > Rules > Publish, or run `npm run deploy:rules` from `tools/testing`.

## One-time Firebase console setup (owner)

Do these in order. Step 1 must come before publishing the new rules, or the
admin is locked out until it is done (the admin panel then shows the id to add).

1. Authentication > Users: copy the admin's **User UID**. Firestore Database >
   start collection `admins` > document id = that UID > field `role` = `admin`.
2. Publish the new `firestore.rules`.
3. Authentication > Settings > User actions: turn **off** "Enable create (sign-up)".
   Authentication > Sign-in method: keep only Email/Password (no Anonymous).
4. In the admin panel: **Download backup**, then **Optimise stored photos**.
5. Optional: Google Cloud console > APIs & Services > Credentials > the browser
   API key > restrict "Website restrictions" to the live domain, the admin domain,
   `chating-45c19.firebaseapp.com` and `localhost`. Test both sites afterwards.
6. Optional: Firebase App Check with reCAPTCHA (free tier) to reject scripted
   form spam. Needs a site key and a small code change.
