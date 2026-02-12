#!/usr/bin/env python3
"""
mini_static_server.py
=====================

A small wrapper around `http.server` with safer path handling.

* No external dependencies (Python ≥ 3.8 standard library).
* Serves the directory you run it from (or one you pass via `--directory`).
* Uses `ThreadingTCPServer` so multiple clients don’t block each other.

Usage
-----
```bash
python mini_static_server.py            # serve cwd on 0.0.0.0:8000
python mini_static_server.py -p 8080    # custom port
python mini_static_server.py -d ./site  # serve files from ./site
```

Flags
-----
* `-d / --directory`  →  directory to serve (default: cwd)
* `-b / --bind`       →  bind address (default: 0.0.0.0)
* `-p / --port`       →  port (default: 8000)
"""
from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import urllib.parse

from typing import List


class SafeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that refuses to serve files outside `directory`.

    This blocks both path traversal (.. segments) and symlinks that resolve
    outside the configured root directory.
    """

    FORBIDDEN_SUFFIXES = {".py", ".md"}

    def translate_path(self, path: str) -> str:  # type: ignore[override]
        # First, let the base class map URLs to a filesystem path underneath
        # self.directory (without resolving symlinks).
        mapped_path = super().translate_path(path)

        # Resolve to a real path (following symlinks), then ensure it stays
        # within the realpath of the server root. If not, point to a guaranteed
        # non-existent path inside the root so the base implementation returns 404.
        root_realpath = os.path.realpath(self.directory or os.getcwd())
        resolved_path = os.path.realpath(mapped_path)
        try:
            common = os.path.commonpath([resolved_path, root_realpath])
        except ValueError:
            # On platforms with drive letters, a mismatch yields ValueError. Treat as outside.
            common = ""
        if common != root_realpath:
            return os.path.join(root_realpath, "__outside__")
        return resolved_path

    def send_head(self):  # type: ignore[override]
        # Determine the filesystem path using our secured translate_path
        parsed = urllib.parse.urlparse(self.path)
        mapped_path = self.translate_path(parsed.path)
        resolved_path = os.path.realpath(mapped_path)

        # If it's a file with a forbidden extension, deny access
        if os.path.isfile(resolved_path):
            _, ext = os.path.splitext(resolved_path)
            if ext.lower() in self.FORBIDDEN_SUFFIXES:
                self.send_error(403, "Forbidden file type")
                return None

        # Delegate actual file/dir handling to the base implementation
        return super().send_head()


def make_server(directory: str, bind: str, port: int):
    handler = functools.partial(SafeHTTPRequestHandler, directory=directory)
    httpd = socketserver.ThreadingTCPServer((bind, port), handler)
    return httpd


def parse_args():
    p = argparse.ArgumentParser(description="Static file server with safer path handling")
    p.add_argument("-d", "--directory", default=os.getcwd(), help="directory to serve (default: cwd)")
    p.add_argument("-b", "--bind", default="0.0.0.0", help="bind address (default: 0.0.0.0)")
    p.add_argument("-p", "--port", default=8002, type=int, help="port (default: 8000)")
    return p.parse_args()


def main():
    args = parse_args()
    srv = make_server(args.directory, args.bind, args.port)
    print(f"Serving {args.directory} on {args.bind}:{args.port} …")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down …")
        srv.server_close()


if __name__ == "__main__":
    main()
