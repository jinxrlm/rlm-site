# site/dev/serve.py — local preview server.
#
# Serves site/ at the server ROOT, so local URLs are structurally identical to
# the deployed ones. That is the whole point: no /site/ prefix means no <base>
# tag, no runtime path rewriting, and no way for local to drift from production.
#
# Stdlib only — site/ is its own repo and shouldn't depend on RLM Tools' venv.
#
#   python dev/serve.py  ->  http://localhost:8002/

import http.server
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = 8002


class Handler(http.server.SimpleHTTPRequestHandler):
    # Keep-alive. The default HTTP/1.0 closes the socket after every response,
    # so a 25-asset page pays a fresh TCP handshake per file and stalls on the
    # browser's 6-connection limit. Safe here: every response below carries a
    # Content-Length, which is what HTTP/1.1 needs to frame the body.
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # Mirrors the host's _redirects (/* /index.html 200): a path with no real
    # file behind it is an SPA route and gets index.html. Anything carrying a
    # non-.html extension is a missing asset and must still 404 — quietly
    # serving HTML in place of a dead .css is exactly how asset bugs hide.
    def translate_path(self, path):
        full = super().translate_path(path)
        p = Path(full)
        if p.exists():
            return full
        if "." in p.name and not p.name.endswith(".html"):
            return full
        return str(ROOT / "index.html")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    # Threaded: one page pulls ~20 images, and a serial server makes the
    # browser's parallel connections queue behind each other — which reads as
    # the page hanging rather than as slowness.
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"site: http://localhost:{PORT}/")
        httpd.serve_forever()
