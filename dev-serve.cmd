@echo off
REM Local HTTP server — bypasses file:// quirks. Open http://localhost:5173 in browser.
npx http-server -p 5173 -c-1 .
