#!/usr/bin/env python3
"""Fill the local Firebase emulator with test data (Python 3 only, no installs).

  1. Start the emulators:   cd tools/testing && npm run emulators
  2. Run this script:       python3 tools/testing/seed_emulator.py
  3. Open the sites with ?emulator, e.g. http://localhost:8080/?emulator and
     http://localhost:8081/?emulator, and sign in to the admin with the test
     account below.

It copies the PUBLIC catalogue (products, slides, gallery, reviews) from the
live site (read-only) so you test with real content, creates a test admin, and
adds sample leads, one of them containing a script-injection attempt that the
admin panel must display as plain text. Nothing is written to the live project.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

LIVE_PROJECT = "chating-45c19"
LIVE_API_KEY = "AIzaSyDx97Ps0fgoTqIiPc-IPqkIP23bkXtPIoQ"
EMULATOR_PROJECT = "demo-ske"
FIRESTORE = f"http://127.0.0.1:8085/v1/projects/{EMULATOR_PROJECT}/databases/(default)/documents"
AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1"

# Emulator-only test account.
TEST_ADMIN_EMAIL = "admin@ske.test"
TEST_ADMIN_PASSWORD = "local-test-only-1"


def request(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def write_doc(path, fields):
    request("PATCH", f"{FIRESTORE}/{path}", {"fields": fields}, {"Authorization": "Bearer owner"})


def copy_live_collection(name):
    base = f"https://firestore.googleapis.com/v1/projects/{LIVE_PROJECT}/databases/(default)/documents/{name}"
    token, count = None, 0
    while True:
        params = {"key": LIVE_API_KEY, "pageSize": "20"}
        if token:
            params["pageToken"] = token
        page = request("GET", f"{base}?{urllib.parse.urlencode(params)}")
        for document in page.get("documents", []):
            write_doc(f"{name}/{document['name'].rsplit('/', 1)[-1]}", document.get("fields", {}))
            count += 1
        token = page.get("nextPageToken")
        if not token:
            return count


def create_admin():
    try:
        user = request("POST", f"{AUTH}/accounts:signUp?key=demo-key",
                       {"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD, "returnSecureToken": True})
    except urllib.error.HTTPError:
        user = request("POST", f"{AUTH}/accounts:signInWithPassword?key=demo-key",
                       {"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD, "returnSecureToken": True})
    write_doc(f"admins/{user['localId']}", {"role": {"stringValue": "admin"}})
    return user["localId"]


def main():
    for name in ("products", "hero_slides", "gallery", "reviews"):
        print(f"copied {copy_live_collection(name):3} {name} from the live site")
    now = {"timestampValue": "2026-10-04T10:00:00Z"}
    write_doc("leads/sample-normal", {
        "name": {"stringValue": "Test Customer"}, "phone": {"stringValue": "+91 98290 00000"},
        "message": {"stringValue": "Need a 5 kW rooftop system"}, "source": {"stringValue": "Homepage quote form"},
        "status": {"stringValue": "new"}, "createdAt": now})
    write_doc("leads/sample-attack", {
        "name": {"stringValue": '<img src=x onerror="document.body.style.background=\'red\'">'},
        "phone": {"stringValue": "9999999999"},
        "message": {"stringValue": "<script>alert('xss')</script>"},
        "status": {"stringValue": "new"}, "createdAt": now})
    uid = create_admin()
    print(f"test admin: {TEST_ADMIN_EMAIL} (uid {uid}), password in tools/testing/seed_emulator.py")


if __name__ == "__main__":
    main()
