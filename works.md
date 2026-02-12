## Works Log

- 2025-08-30: Moved "Virtual Brain DEMO" button into GBM project card, set button colors (white bg, black text; hover to black/white). Fixed CSS corruption. Removed navbar button. Added preprint link to GBM card and new publication entry for "A Sensing Whole Brain Zebrafish Foundation Model for Neuron Dynamics and Behavior". Increased font size of preprint link in GBM card. Files updated: `index.html`, `styles.css`.


- 2025-09-13: Hardened Python static server to confine file serving strictly to site root. Added `SafeHTTPRequestHandler` overriding `translate_path` to prevent path traversal and symlink escapes outside the configured directory; wrapped with existing rate limiter. Files updated: `main.py`.

- 2025-09-13: Blocked serving of `.py` and `.md` files by overriding `send_head` to return 403 for forbidden suffixes. Files updated: `main.py`.
 
- 2025-09-14: Removed in-app rate limiting (now handled by Cloudflare). Cleaned CLI flags and docs; kept safe path handling and forbidden suffixes. Files updated: `main.py`, `works.md`.

