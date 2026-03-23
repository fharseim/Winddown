# HR Crawler — Standalone Handelsregister Service

A long-lived Express server that proxies requests to handelsregister.de.
Deployed on Railway (non-cloud IP) so it can reach the Handelsregister
without getting blocked, and called by the Vercel frontend via HTTP proxy.

## Why Railway?

Vercel serverless functions run from cloud datacenter IPs that handelsregister.de
blocks. Railway gives us a persistent server with a residential-like IP that
can maintain sessions across requests.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check — no auth required |
| GET | `/api/search?q=N26+GmbH` | Company name search |
| GET | `/api/documents?registerArt=HRB&registerNummer=198234&registerGericht=Frankfurt` | List available documents |
| GET | `/api/download?registerArt=HRB&registerNummer=198234&registerGericht=Frankfurt&docType=SI` | Download document binary |

All `/api/*` routes require the `x-api-secret` header.

## Local development

```bash
cd crawler
npm install

# Create your local .env
cp .env.example .env
# Edit .env and set API_SECRET=test (or leave empty for open dev mode)

node server.js
# → [hr-crawler] listening on port 3001

# Test health
curl http://localhost:3001/health

# Test search (no auth if API_SECRET not set)
curl "http://localhost:3001/api/search?q=N26" -H "x-api-secret: test"

# Test document list
curl "http://localhost:3001/api/documents?registerArt=HRB&registerNummer=198234&registerGericht=Frankfurt%20am%20Main" \
  -H "x-api-secret: test"

# Test download
curl -O -J "http://localhost:3001/api/download?registerArt=HRB&registerNummer=198234&registerGericht=Frankfurt%20am%20Main&docType=SI" \
  -H "x-api-secret: test"
```

## Deploy on Railway

1. Create a new Railway project and connect this `crawler/` directory as the source
   (or point it at the repo root and set the root directory to `crawler/`).

2. Railway auto-detects the `Dockerfile` — no extra config needed.

3. Set environment variables in Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `API_SECRET` | A strong random secret (share with Vercel as `CRAWLER_SECRET`) |
   | `ALLOWED_ORIGINS` | `https://riseq.eu,https://www.riseq.eu,https://winddown-eosin.vercel.app` |

4. After deploy, note the Railway public URL (e.g. `https://rise-hr-crawler.up.railway.app`).

5. Set these variables in your Vercel project:

   | Variable | Value |
   |----------|-------|
   | `CRAWLER_URL` | `https://rise-hr-crawler.up.railway.app` |
   | `CRAWLER_SECRET` | Same value as `API_SECRET` on Railway |

## Architecture

```
Browser → Vercel /api/hr-search → Railway /api/search → handelsregister.de
                 /api/hr-documents → Railway /api/documents
                 /api/hr-download  → Railway /api/download
```

When `CRAWLER_URL` is not set on Vercel, the API routes fall back to
attempting a direct connection to handelsregister.de (useful for local dev).

## Rate limits

- **Per IP**: 50 requests/minute (express-rate-limit)
- **To handelsregister.de**: 60 requests/hour (token bucket, shared across all incoming requests)

## Session pooling

The server maintains a pool of up to 3 warm sessions (10-minute TTL) to
avoid the overhead of a fresh GET request to handelsregister.de on every
incoming search.
