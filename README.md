#  CuraBook

A medical appointment booking platform. Patients find doctors and book visits, doctors and assistants manage schedules and prescriptions, and admins oversee hospitals. Bilingual (Arabic RTL / English).

**Stack:** Django REST · React 18 · PostgreSQL · Redis · Celery · WebSockets · Docker


## Run it

Requires Docker Desktop, Python 3 and Git.

```bash
git clone https://github.com/ahmedfathy5312/CuraBook.git
cd CuraBook

# 1. Generate JWT keys (not stored in the repo)
pip install cryptography
python scripts/generate_jwt_keys.py
```

2. Create a `.env` file in the project root:

```env
DJANGO_SETTINGS_MODULE=curabook.settings.dev
DEBUG=True
DJANGO_SECRET_KEY=dev-only-secret-change-me
DB_NAME=curabook_db
DB_USER=curabook_user
DB_PASSWORD=curabook_dev_password
DB_HOST=db
DB_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_password
REDIS_URL=redis://:dev_redis_password@redis:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1,web,nginx
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3080
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:3080
SMS_PROVIDER=console
BILLING_PROVIDER=mock
VIDEO_PROVIDER=jitsi
JITSI_DOMAIN=meet.jit.si
```

3. Start everything, then seed demo data from a second terminal:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

docker compose exec web python manage.py seed_billing_plans
docker compose exec web python manage.py seed_full_demo
```

4. Open **http://localhost:5173**

API docs: http://localhost:8000/api/v1/docs/

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Platform admin | `platform_admin` | `Admin@1234` |
| Hospital admin | `admin_shifa` | `Demo@1234` |
| Doctor | `dr_shifa_cardio` | `Demo@1234` |
| Patient | `pat1` | `Demo@1234` |

Demo data only