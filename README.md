# Teleclip

Teleclip is a tiny clipboard reflector for moving text between your own devices.

Copy here. Paste there.

## Live Site

```text
https://teleclip.hadibtf.ir/
```

## Features

- Reflect text to a host-side shared board
- Show newest reflected text at the top of history
- Copy, paste, clear, delete one item, or delete all with confirmation
- QR popup for opening Teleclip on another device
- English and Persian UI with RTL support
- Light and dark themes
- Favicon/app icons from `favicon_io`

## Identity

Teleclip uses this color palette:

```text
#00D5A7
#1CC6C2
#0DD1ED
```

## Project Layout

```text
src/                  React + Vite frontend
public/api/           PHP endpoints for cPanel hosting
public/.htaccess      Apache routing for subdomain-root hosting
favicon_io/           Source favicon assets
dist/                 Production build output
scripts/deploy-cpanel.mjs
deploy.env.sample
```

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:18731/
```

If needed:

```powershell
$env:VITE_DEV_PORT="18831"; $env:DEV_API_PORT="18832"; npm run dev
```

## Build

```bash
npm run build
```

## cPanel Deploy

The subdomain document root is:

```text
teleclip
```

Set `deploy.env` like:

```text
FTP_REMOTE_DIR=teleclip
VITE_BASE_PATH=/
```

Then deploy:

```bash
npm run deploy:cpanel
```

The app stores reflected text in:

```text
teleclip/.teleclip-data
```

That folder is blocked from public access by `.htaccess`.

## API

```text
GET    /api/reflect
POST   /api/reflect
DELETE /api/reflect
DELETE /api/reflect/:id
```

## Notes

- No accounts
- No analytics
- No permanent external database
- Storage is host-local JSON for low maintenance
