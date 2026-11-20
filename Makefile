# ─────────────────────────────────────────────────────────────────────────────
# CuraBook — Makefile
# Convenience commands for the full-stack monorepo.
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: help dev prod stop logs logs-web logs-celery \
        migrate makemigrations shell superuser \
        frontend-build frontend-dev \
        test-backend test-frontend test-all \
        urls collectstatic clean \
        db-shell redis-cli restart \
        db-backup db-restore db-backup-list \
        pre-deploy-check security-scan

# Default target
help:
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║              CuraBook — Available Make Commands              ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  DEVELOPMENT:"
	@echo "    make dev              Start all services (dev mode)"
	@echo "    make prod             Start all services (prod mode, detached)"
	@echo "    make stop             Stop all running containers"
	@echo "    make restart          Restart all containers"
	@echo ""
	@echo "  FRONTEND:"
	@echo "    make frontend-build   Build React for production"
	@echo "    make frontend-dev     Start React dev server (outside Docker)"
	@echo ""
	@echo "  DJANGO:"
	@echo "    make migrate          Run database migrations"
	@echo "    make makemigrations   Create new migration files"
	@echo "    make shell            Open Django shell"
	@echo "    make superuser        Create Django superuser"
	@echo "    make collectstatic    Collect Django static files"
	@echo "    make urls             List all URL patterns"
	@echo ""
	@echo "  LOGS:"
	@echo "    make logs             Tail logs for all services"
	@echo "    make logs-web         Tail Django logs only"
	@echo "    make logs-celery      Tail Celery worker logs"
	@echo ""
	@echo "  TESTING:"
	@echo "    make test-backend     Run Django test suite"
	@echo "    make test-frontend    Run React test suite"
	@echo "    make test-all         Run all tests (backend + frontend)"
	@echo ""
	@echo "  DATABASE BACKUP:"
	@echo "    make db-backup        Create timestamped database backup"
	@echo "    make db-restore       Restore from backup (BACKUP=<file>)"
	@echo "    make db-backup-list   List all available backups"
	@echo ""
	@echo "  DEPLOYMENT:"
	@echo "    make pre-deploy-check Validate .env before deploying (REQUIRED)"
	@echo "    make security-scan    Run pip-audit + TruffleHog locally"
	@echo ""
	@echo "  DATABASE TOOLS:"
	@echo "    make db-shell         Open PostgreSQL shell"
	@echo "    make redis-cli        Open Redis CLI"
	@echo ""
	@echo "  CLEANUP:"
	@echo "    make clean            Remove stopped containers + orphan volumes"
	@echo ""

# ── Docker Compose ─────────────────────────────────────────────────────────────

dev:  ## Start all dev services (with build)
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

prod:  ## Start production stack (detached)
	docker-compose up -d --build
	@echo "✅ Production stack started"
	@echo "   App:     http://localhost"
	@echo "   API:     http://localhost/api/v1/"
	@echo "   Admin:   http://localhost/admin/"
	@echo "   Docs:    http://localhost/api/v1/docs/"

stop:  ## Stop all containers
	docker-compose down

restart:  ## Restart all containers
	docker-compose restart

# ── Frontend ───────────────────────────────────────────────────────────────────

frontend-build:  ## Build React production bundle and copy to nginx volume
	@echo "🏗️  Building React frontend..."
	docker-compose --profile build run --rm frontend_build
	@echo "✅ Frontend built and available to NGINX via frontend_dist volume"

frontend-dev:  ## Start React dev server outside Docker (hot-reload)
	@echo "🚀 Starting React dev server on http://localhost:3000"
	cd frontend && npm start

# ── Django Management Commands ─────────────────────────────────────────────────

migrate:  ## Run database migrations
	docker-compose exec web python manage.py migrate

makemigrations:  ## Create new migration files
	docker-compose exec web python manage.py makemigrations

shell:  ## Open Django interactive shell
	docker-compose exec web python manage.py shell

superuser:  ## Create Django superuser account
	docker-compose exec web python manage.py createsuperuser

collectstatic:  ## Collect static files
	docker-compose exec web python manage.py collectstatic --noinput

urls:  ## List all URL patterns (requires django-extensions)
	docker-compose exec web python manage.py show_urls | grep "api/v1"

# ── Logs ───────────────────────────────────────────────────────────────────────

logs:  ## Tail logs for all services
	docker-compose logs -f

logs-web:  ## Tail Django/Daphne logs only
	docker-compose logs -f web

logs-celery:  ## Tail Celery worker logs
	docker-compose logs -f celery_worker

logs-nginx:  ## Tail NGINX logs
	docker-compose logs -f nginx

# ── Testing ────────────────────────────────────────────────────────────────────

test-backend:  ## Run Django test suite
	docker-compose exec web python manage.py test --verbosity=2

test-frontend:  ## Run React test suite
	cd frontend && npm test -- --watchAll=false

test-all:  ## Run backend + frontend tests
	@echo "🧪 Running backend tests..."
	docker-compose exec web python manage.py test --verbosity=1
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test -- --watchAll=false
	@echo "✅ All tests passed"

# ── Database Backup ────────────────────────────────────────────────────────────

BACKUP_DIR ?= ./backups
TIMESTAMP  := $(shell date +%Y%m%d_%H%M%S)

db-backup:  ## Create a timestamped PostgreSQL backup
	@mkdir -p $(BACKUP_DIR)
	@echo "📦 Backing up database..."
	docker-compose exec -T db pg_dump \
		-U $${DB_USER:-curabook_user} \
		-d $${DB_NAME:-curabook_db} \
		--format=custom \
		--compress=9 \
		> $(BACKUP_DIR)/curabook_$(TIMESTAMP).dump
	@echo "✅ Backup saved: $(BACKUP_DIR)/curabook_$(TIMESTAMP).dump"
	@ls -lh $(BACKUP_DIR)/curabook_$(TIMESTAMP).dump

db-restore:  ## Restore from backup. Usage: make db-restore BACKUP=./backups/curabook_YYYYMMDD.dump
	@if [ -z "$(BACKUP)" ]; then echo "❌ Usage: make db-restore BACKUP=<path>"; exit 1; fi
	@echo "⚠️  This will OVERWRITE the current database. Continue? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo "🔄 Restoring from $(BACKUP)..."
	docker-compose exec -T db pg_restore \
		-U $${DB_USER:-curabook_user} \
		-d $${DB_NAME:-curabook_db} \
		--clean --if-exists \
		< $(BACKUP)
	@echo "✅ Database restored from $(BACKUP)"

db-backup-list:  ## List all available backups
	@echo "📂 Available backups in $(BACKUP_DIR):"
	@ls -lh $(BACKUP_DIR)/*.dump 2>/dev/null || echo "  (no backups found)"

# ── Pre-deploy Validation ──────────────────────────────────────────────────────

pre-deploy-check:  ## Validate .env file before deploying to production
	@echo "🔍 Running pre-deploy checks..."
	@if [ ! -f .env ]; then echo "❌ .env file not found. Run: cp .env.example .env"; exit 1; fi
	@echo "  ✓ .env file exists"
	@grep -q "CHANGE_THIS\|your-strong\|change-me\|your_strong\|your-access-key" .env && \
		echo "❌ .env contains placeholder values — fill in all secrets before deploying!" && exit 1 || \
		echo "  ✓ No obvious placeholder values found"
	@grep -q "^DJANGO_SECRET_KEY=.\{50,\}" .env && echo "  ✓ Django secret key looks strong" || \
		echo "⚠️  Django secret key may be too short (should be 50+ chars)"
	@grep -q "^DEBUG=False" .env && echo "  ✓ DEBUG=False" || \
		echo "⚠️  DEBUG is not False — never deploy with DEBUG=True"
	@grep -q "^SENTRY_DSN=https://" .env && echo "  ✓ Sentry DSN configured" || \
		echo "⚠️  SENTRY_DSN not set — error monitoring will be disabled in production"
	@grep -q "^GRAFANA_PASSWORD=" .env && \
		grep "^GRAFANA_PASSWORD=admin$$\|^GRAFANA_PASSWORD=CHANGE_THIS" .env && \
		echo "❌ Grafana password is still default!" && exit 1 || \
		echo "  ✓ Grafana password changed"
	@echo ""
	@echo "✅ Pre-deploy check passed — review any ⚠️  warnings above"

security-scan:  ## Run pip-audit + dependency check locally
	@echo "🔒 Running security scan..."
	pip install pip-audit --quiet
	pip-audit -r backend/requirements.txt
	@echo "✅ Security scan complete"

# ── Database Tools ─────────────────────────────────────────────────────────────

db-shell:  ## Open PostgreSQL interactive shell
	docker-compose exec db psql -U $${DB_USER:-curabook_user} -d $${DB_NAME:-curabook_db}

redis-cli:  ## Open Redis CLI
	docker-compose exec redis redis-cli

# ── Cleanup ────────────────────────────────────────────────────────────────────

clean:  ## Remove stopped containers and orphaned volumes
	docker-compose down --remove-orphans
	docker volume prune -f
	@echo "✅ Cleaned up stopped containers and orphaned volumes"
