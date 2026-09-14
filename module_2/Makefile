# Weekslot (module_2)
#
# Usage:
#   make help
#   make install
#   make dev
#   make backend
#   make frontend
#   make test

BACKEND_DIR := backend
FRONTEND_DIR := frontend
BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 8080

.PHONY: help install install-backend install-frontend dev backend frontend test test-backend test-frontend

help:
	@echo "Weekslot commands"
	@echo ""
	@echo "  make install          Install backend + frontend deps"
	@echo "  make dev              Run backend + frontend together"
	@echo "  make backend          Run API on http://127.0.0.1:$(BACKEND_PORT)"
	@echo "  make frontend         Run UI on http://localhost:$(FRONTEND_PORT)"
	@echo "  make test             Run backend + frontend tests"
	@echo "  make test-backend     Run backend tests only"
	@echo "  make test-frontend    Run frontend tests only"
	@echo ""
	@echo "Override ports: make backend BACKEND_PORT=8091"
	@echo ""
	@echo "On Windows PowerShell (no make): .\\make.ps1 <target>"

install: install-backend install-frontend

install-backend:
	cd $(BACKEND_DIR) && uv sync

install-frontend:
	cd $(FRONTEND_DIR) && npm install

# Run both in parallel (Ctrl+C stops the make process group).
dev:
	@$(MAKE) -j2 backend frontend

backend:
	cd $(BACKEND_DIR) && uv run uvicorn app.main:app --reload --port $(BACKEND_PORT)

frontend:
	cd $(FRONTEND_DIR) && npm run dev -- --port $(FRONTEND_PORT)

test: test-backend test-frontend

test-backend:
	cd $(BACKEND_DIR) && uv run pytest

test-frontend:
	cd $(FRONTEND_DIR) && npm test
