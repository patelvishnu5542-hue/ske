#!/usr/bin/env python3
"""Pre-deploy checks for both sites. Exits 1 if anything needs fixing.

    python3 tools/check_site.py

Checks: broken local file references, placeholder content, the WhatsApp/phone
numbers in links, inline scripts or event handlers (blocked by the
Content-Security-Policy), unsafe new-tab links, basic page metadata, and that
asset version stamps are current.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITES = [ROOT / "ske" / "public-customer", ROOT / "ske" / "public-admin"]

WHATSAPP_NUMBER = "919829545113"
PHONE_NUMBERS = {"+919829545113", "+919928586897", "+919828283132"}
PLACEHOLDERS = [
    r"9999999999", r"via\.placeholder\.com", r"unsplash\.com", r"lorem ipsum",
    r"example\.com", r"\bTODO\b", r"\bFIXME\b", r"your-?domain", r"placeholder\.png",
]

problems = []


def report(path, message):
    problems.append(f"{path.relative_to(ROOT)}: {message}")


def local_refs(text, suffix):
    if suffix == ".html":
        pattern = r"""(?:href|src)=["']([^"'#?]+)(?:\?[^"']*)?(?:#[^"']*)?["']"""
    elif suffix == ".css":
        pattern = r"""url\(['"]?([^'")?#]+)"""
    else:
        pattern = r"""from ['"](\.{1,2}/[^'"?]+)"""
    for ref in re.findall(pattern, text):
        if re.match(r"^(https?:|mailto:|tel:|data:|blob:|#|javascript:)", ref) or not ref.strip():
            continue
        yield ref


def resolve(site, source, ref):
    if ref.startswith("/"):
        target = site / ref.lstrip("/")
    else:
        target = (source.parent / ref).resolve()
    if target.is_dir():
        target = target / "index.html"
    if target.exists():
        return True
    # Netlify "pretty URLs": /gallery serves gallery.html.
    return target.with_suffix(".html").exists() or (site / ref.lstrip("./")).exists()


for site in SITES:
    for path in sorted(site.rglob("*")):
        if path.suffix not in {".html", ".css", ".js"} or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")

        for ref in local_refs(text, path.suffix):
            if not resolve(site, path, ref):
                report(path, f"reference to missing file '{ref}'")

        for pattern in PLACEHOLDERS:
            if re.search(pattern, text, re.IGNORECASE):
                report(path, f"placeholder content matches '{pattern}'")

        for number in re.findall(r"wa\.me/([^?\"'\s<>`$]*)", text):
            if number and number != WHATSAPP_NUMBER:
                report(path, f"WhatsApp link to '{number}' (expected {WHATSAPP_NUMBER}, digits only)")
        if path.suffix == ".html":
            for link in re.findall(r"https://wa\.me/[^\"'\s<>]*", text):
                if "?text=" not in link:
                    report(path, f"WhatsApp link without a pre-filled message: {link}")
        for number in re.findall(r"tel:(\+?\d{6,})", text):
            if number not in PHONE_NUMBERS:
                report(path, f"phone link to unknown number '{number}'")

        if path.suffix == ".html":
            for attrs in re.findall(r"<script\b([^>]*)>", text):
                if "src=" not in attrs and "application/ld+json" not in attrs:
                    report(path, "inline <script> (blocked by the Content-Security-Policy)")
            if re.search(r"\son[a-z]+\s*=\s*[\"']", text):
                report(path, "inline event handler attribute (blocked by the Content-Security-Policy)")
            for tag in re.findall(r"<a\b[^>]*target=[\"']_blank[\"'][^>]*>", text):
                if "noopener" not in tag:
                    report(path, "target=_blank link without rel=\"noopener\"")
            if path.name != "404.html":
                for needle, what in [("<html lang=", "lang attribute"), ("<title>", "title"),
                                     ('name="viewport"', "viewport meta")]:
                    if needle not in text:
                        report(path, f"missing {what}")
                if site.name == "public-customer" and 'name="description"' not in text:
                    report(path, "missing meta description")

stamp = subprocess.run([sys.executable, str(ROOT / "tools" / "stamp_assets.py"), "--check"],
                       capture_output=True, text=True)
if stamp.returncode != 0:
    problems.append("asset stamps are stale: run python3 tools/stamp_assets.py\n" + stamp.stdout)

if problems:
    print("\n".join(problems))
    sys.exit(1)
print("site checks passed")
