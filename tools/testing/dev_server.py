#!/usr/bin/env python3
"""Local dev server for the static sites (no install needed, Python 3 only).

Behaves like Netlify where it matters for testing:
  * applies the site's _headers file (Content-Security-Policy etc.), so a
    blocked script or style shows up locally before it reaches production;
  * serves /gallery from gallery.html ("pretty URLs");
  * returns 404.html with a 404 status for missing pages.
Differences on purpose: browser caching is disabled (edits show on refresh) and
the CSP also allows the local Firebase emulator.

Note: unless a page is opened with ?emulator, it talks to the LIVE Firebase
project, so form submissions and admin edits change production data.
"""
import argparse
import functools
import http.server
import pathlib
import re

EMULATOR_ORIGINS = "http://127.0.0.1:8085 http://127.0.0.1:9099 http://localhost:8085 http://localhost:9099"


def parse_headers_file(path):
    """Netlify _headers: a path line, then indented `Name: value` lines."""
    rules = []
    if not path.is_file():
        return rules
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line[0].isspace():
            rules.append((line.strip(), []))
        elif rules and ":" in line:
            name, value = line.strip().split(":", 1)
            rules[-1][1].append((name.strip(), value.strip()))
    return rules


def path_matches(pattern, path):
    regex = "^" + re.escape(pattern).replace(r"\*", ".*") + "$"
    return re.match(regex, path) is not None


class DevHandler(http.server.SimpleHTTPRequestHandler):
    rules = []

    def end_headers(self):
        path = self.path.split("?")[0]
        merged = {}
        for pattern, headers in self.rules:
            if path_matches(pattern, path):
                for name, value in headers:
                    merged[name] = value
        merged["Cache-Control"] = "no-store"
        csp = merged.get("Content-Security-Policy")
        if csp:
            merged["Content-Security-Policy"] = csp.replace(
                "connect-src", f"connect-src {EMULATOR_ORIGINS}").replace(" upgrade-insecure-requests", "")
        for name, value in merged.items():
            self.send_header(name, value)
        super().end_headers()

    def send_head(self):
        path = self.path.split("?")[0]
        root = pathlib.Path(self.directory)
        if path != "/" and "." not in path.rsplit("/", 1)[-1] and (root / f"{path.lstrip('/')}.html").is_file():
            self.path = path + ".html" + self.path[len(path):]
        elif not (root / path.lstrip("/")).exists() and (root / "404.html").is_file():
            body = (root / "404.html").read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return _Body(body)
        return super().send_head()


class _Body:
    """File-like wrapper so an in-memory body flows through the normal GET/HEAD path."""

    def __init__(self, data):
        self.data = data

    def read(self, *_):
        data, self.data = self.data, b""
        return data

    def close(self):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("directory", help="site folder, e.g. ske/public-customer")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    DevHandler.rules = parse_headers_file(pathlib.Path(args.directory) / "_headers")
    handler = functools.partial(DevHandler, directory=args.directory)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Serving {args.directory} at http://localhost:{args.port}/", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
