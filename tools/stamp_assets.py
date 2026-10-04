#!/usr/bin/env python3
"""Stamp every versioned asset reference with a hash of the file's content.

References opt in by carrying a `?v=` query, e.g. `css/style.css?v=1a2b3c4d`
or `import ... from './data.js?v=1a2b3c4d'`. Running this rewrites each one to
the first 8 hex digits of the target file's SHA-256, so:

  * a changed file gets a new URL, and _headers can tell browsers to cache
    /css, /js, /fonts and /img for a year without ever serving stale files;
  * an unchanged file keeps its URL, so returning visitors keep their cache.

Each service worker's `const VERSION = '...'` becomes a hash of all the stamps,
which retires its old caches on every release that changes anything.

Run it before every deploy (it is idempotent):
    python3 tools/stamp_assets.py            # rewrite files
    python3 tools/stamp_assets.py --check    # exit 1 if anything is stale
"""
import argparse
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITES = [ROOT / "ske" / "public-customer", ROOT / "ske" / "public-admin"]
TEXT_SUFFIXES = {".html", ".css", ".js"}
REF = re.compile(r"""(?P<path>(?:\.{1,2}/|/)?(?:[\w-]+/)*[\w.-]+\.(?:css|js|woff2|svg|jpe?g|png|webp))\?v=(?P<hash>[0-9a-f]{8})""")
SW_VERSION = re.compile(r"const VERSION = '([0-9a-f]{8})';")


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def resolve(site, source, ref):
    """Paths starting with / are site-absolute; others are tried relative to the
    referencing file, then to the site root (JS strings used by HTML pages)."""
    if ref.startswith("/"):
        candidates = [site / ref.lstrip("/")]
    else:
        candidates = [source.parent / ref, site / ref]
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate.is_file() and site.resolve() in candidate.parents:
            return candidate
    return None


def stamp_site(site):
    files = [p for p in site.rglob("*") if p.suffix in TEXT_SUFFIXES and p.is_file()]
    missing = set()
    changed = set()

    # Files reference each other (HTML -> JS -> JS), so repeat until stable.
    for _ in range(20):
        dirty = False
        for path in files:
            text = path.read_text(encoding="utf-8")

            def replace(match):
                target = resolve(site, path, match.group("path"))
                if target is None:
                    missing.add(f"{path.relative_to(ROOT)}: {match.group('path')}")
                    return match.group(0)
                return f"{match.group('path')}?v={file_hash(target)}"

            new_text = REF.sub(replace, text)
            if new_text != text:
                path.write_text(new_text, encoding="utf-8")
                changed.add(path)
                dirty = True
        if not dirty:
            break
    else:
        sys.exit(f"{site}: references did not settle (circular imports?)")

    stamps = sorted({m.group(0) for p in files for m in REF.finditer(p.read_text(encoding="utf-8"))})
    version = hashlib.sha256("\n".join(stamps).encode()).hexdigest()[:8]
    for sw in site.glob("sw.js"):
        text = sw.read_text(encoding="utf-8")
        new_text = SW_VERSION.sub(f"const VERSION = '{version}';", text)
        if new_text != text:
            sw.write_text(new_text, encoding="utf-8")
            changed.add(sw)
    return changed, missing


def main():
    parser = argparse.ArgumentParser(description="Stamp asset URLs with content hashes.")
    parser.add_argument("--check", action="store_true", help="fail if any stamp is out of date")
    args = parser.parse_args()

    originals = {}
    if args.check:
        for site in SITES:
            for path in site.rglob("*"):
                if path.is_file() and (path.suffix in TEXT_SUFFIXES):
                    originals[path] = path.read_bytes()

    all_changed, all_missing = set(), set()
    for site in SITES:
        changed, missing = stamp_site(site)
        all_changed |= changed
        all_missing |= missing

    if args.check:
        for path, data in originals.items():
            path.write_bytes(data)

    for item in sorted(all_missing):
        print(f"missing file for reference: {item}")
    for path in sorted(all_changed):
        print(f"{'stale' if args.check else 'stamped'}: {path.relative_to(ROOT)}")
    if all_missing or (args.check and all_changed):
        sys.exit(1)
    if not all_changed:
        print("all asset stamps are current")


if __name__ == "__main__":
    main()
