# Breath Pacer Backend (Django + DRF + Firebase + Postgres)

API backend for the Breath Pacer mobile app (iOS/Android). Auth is via Firebase ID tokens; data is stored in PostgreSQL.

## Stack
- Django, Django REST Framework
- Firebase Admin (ID token verification)
- PostgreSQL (psycopg2)
- CORS via `django-cors-headers`
- Whitenoise for static files (production)

## Quickstart

### 1) Create & activate a virtual env
**Windows (PowerShell)**
```powershell
python -m venv .venv
.venv\\Scripts\\Activate.ps1