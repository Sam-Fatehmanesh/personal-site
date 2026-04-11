#!/usr/bin/env python3
"""
mini_static_server.py
=====================

A small wrapper around `http.server` with safer path handling.

* No external dependencies (Python >= 3.8 standard library).
* Serves the directory you run it from (or one you pass via `--directory`).
* Uses `ThreadingTCPServer` so multiple clients don't block each other.

Usage
-----
```bash
python mini_static_server.py            # serve cwd on 127.0.0.1:8002
python mini_static_server.py -p 8080    # custom port
python mini_static_server.py -d ./site  # serve files from ./site
```

Flags
-----
* `-d / --directory`  ->  directory to serve (default: cwd)
* `-b / --bind`       ->  bind address (default: 127.0.0.1)
* `-p / --port`       ->  port (default: 8002)
"""
from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import urllib.parse

class SafeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Static handler that serves only publishable assets inside `directory`.

    This blocks path traversal, hidden paths like `.git`, backup artifacts,
    directory listings, and non-web source files by using a small extension
    allowlist instead of a blacklist.
    """

    ALLOWED_FILE_SUFFIXES = {
        ".html", ".css", ".js", ".mjs",
        ".json", ".txt", ".xml",
        ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
        ".mp4", ".webm", ".pdf",
        ".woff", ".woff2", ".ttf", ".otf"
    }
    FORBIDDEN_SEGMENTS = {"__pycache__"}
    FORBIDDEN_SUFFIX_FRAGMENTS = {".bak", ".old", ".orig", ".tmp", ".swp", "~"}

    def _get_root_realpath(self) -> str:
        return os.path.realpath(self.directory or os.getcwd())

    def _path_segments(self, raw_path: str) -> list[str]:
        parsed = urllib.parse.urlparse(raw_path)
        return [segment for segment in parsed.path.split("/") if segment not in ("", ".")]

    def _is_publishable_request_path(self, raw_path: str) -> bool:
        for segment in self._path_segments(raw_path):
            if segment.startswith(".") or segment in self.FORBIDDEN_SEGMENTS:
                return False
            if any(segment.endswith(suffix) for suffix in self.FORBIDDEN_SUFFIX_FRAGMENTS):
                return False
        return True

    def translate_path(self, path: str) -> str:  # type: ignore[override]
        # First, let the base class map URLs to a filesystem path underneath
        # self.directory (without resolving symlinks).
        mapped_path = super().translate_path(path)

        # Resolve to a real path (following symlinks), then ensure it stays
        # within the realpath of the server root. If not, point to a guaranteed
        # non-existent path inside the root so the base implementation returns 404.
        root_realpath = self._get_root_realpath()
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
        if not self._is_publishable_request_path(self.path):
            self.send_error(403, "Forbidden path")
            return None

        # Determine the filesystem path using our secured translate_path
        parsed = urllib.parse.urlparse(self.path)
        mapped_path = self.translate_path(parsed.path)
        resolved_path = os.path.realpath(mapped_path)

        root_realpath = self._get_root_realpath()
        try:
            common = os.path.commonpath([resolved_path, root_realpath])
        except ValueError:
            common = ""
        if common != root_realpath:
            self.send_error(404, "File not found")
            return None

        if os.path.isfile(resolved_path):
            filename = os.path.basename(resolved_path)
            _, ext = os.path.splitext(filename)
            if ext.lower() not in self.ALLOWED_FILE_SUFFIXES:
                self.send_error(403, "Forbidden file type")
                return None

        # Delegate actual file/dir handling to the base implementation
        return super().send_head()

    def list_directory(self, path):  # type: ignore[override]
        self.send_error(403, "Directory listing is disabled")
        return None


def make_server(directory: str, bind: str, port: int):
    handler = functools.partial(SafeHTTPRequestHandler, directory=directory)
    httpd = socketserver.ThreadingTCPServer((bind, port), handler)
    return httpd


def parse_args():
    p = argparse.ArgumentParser(description="Static file server with safer path handling")
    p.add_argument("-d", "--directory", default=os.getcwd(), help="directory to serve (default: cwd)")
    p.add_argument("-b", "--bind", default="127.0.0.1", help="bind address (default: 127.0.0.1)")
    p.add_argument("-p", "--port", default=8002, type=int, help="port (default: 8002)")
    return p.parse_args()


def main():
    args = parse_args()
    srv = make_server(args.directory, args.bind, args.port)
    print(f"Serving {args.directory} on {args.bind}:{args.port} ...")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down ...")
        srv.server_close()


if __name__ == "__main__":
    main()
