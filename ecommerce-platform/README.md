# E-Commerce Microservices Platform

A production-ready, DevOps-enabled microservices e-commerce platform deployed on AWS using Terraform-provisioned, self-managed Kubernetes (kubeadm).

## Architecture

```
                    ┌─────────────┐
                    │   Frontend   │  React SPA
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ NGINX Ingress│
                    └──────┬──────┘
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │ User Service │ │ Product  │ │Order Service│
     │  (Node.js)  │ │ Service  │ │  (FastAPI)  │
     └──────┬──────┘ │(Node.js) │ └──────┬──────┘
            │        └────┬─────┘        │
            │             │              │
            │      ┌──────▼──────┐       │
            │      │   Payment   │       │
            │      │  Service    │       │
            │      │  (FastAPI)  │       │
            │      └──────┬──────┘       │
            │             │              │
     ┌──────▼─────────────▼──────────────▼──────┐
     │              RabbitMQ                     │
     └──────┬─────────────┬──────────────┬──────┘
            │             │              │
     ┌──────▼──────┐ ┌───▼────┐  ┌──────▼──────┐
     │ PostgreSQL  │ │ Redis  │  │ Prometheus  │
     └─────────────┘ └────────┘  │ + Grafana   │
                                 └─────────────┘
```

## Services

| Service         | Tech Stack       | Port |
|-----------------|------------------|------|
| Frontend        | React 18         | 3000 |
| User Service    | Node.js/Express  | 3001 |
| Product Service | Node.js/Express  | 3002 |
| Order Service   | Python/FastAPI   | 8001 |
| Payment Service | Python/FastAPI   | 8002 |

## Infrastructure

- **Cloud**: AWS (Free Tier Friendly)
- **IaC**: Terraform
- **Container Orchestration**: Self-managed Kubernetes via kubeadm
- **Compute**: EC2 instances (1 control plane + 2 workers)
- **Networking**: VPC with public/private subnets
- **CNI**: Calico
- **Ingress**: NGINX Ingress Controller

## Quick Start

### 1. Provision Infrastructure
```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```
> **Note**: Uses `bastion-11-1-26.pem` key pair (located in project root `../bastion-11-1-26.pem`)

### 2. Bootstrap Kubernetes
SSH into control plane node:
```bash
ssh -i bastion-11-1-26.pem ubuntu@<CONTROL_PLANE_IP>
sudo bash /tmp/control-plane-init.sh
```

### 3. Join Workers
SSH into each worker node and run the join command from step 2.

### 4. Deploy Services
```bash
kubectl apply -k infra/k8s/dev/
```

## CI/CD

GitHub Actions workflows handle:
- **CI**: Lint, test, build Docker images, Trivy scan, push to registry
- **CD**: Security gate → Deploy to dev (develop branch) or prod (main/master branch) → Health check → Auto-rollback on failure

### Required GitHub Secrets
| Secret | Value |
|--------|-------|
| `EC2_SSH_KEY` | Contents of `bastion-11-1-26.pem` |
| `DOCKER_PASSWORD` | `Amazon1Seller@@` |
| `CONTROL_PLANE_IP` | EC2 control plane public IP (from terraform output) |

> Docker Hub username `asylums` is hardcoded in workflows.

## DevSecOps Pipeline

Security is integrated at every stage — not bolted on at the end. Three workflows run in parallel:

```
Push / PR
   │
   ├── CI Pipeline (ci.yaml)
   │   ├── Lint (ESLint, Flake8)
   │   ├── Test (Jest, Pytest)
   │   ├── Docker Build
   │   ├── Trivy CVE Scan ← blocks on CRITICAL
   │   ├── Trivy Secret Scan ← hard block
   │   └── Push to Docker Hub
   │
   ├── Security Pipeline (security.yaml)
   │   ├── 🔐 Gitleaks (secret scanning) ← hard block
   │   ├── 🔍 Semgrep SAST (code vulnerabilities)
   │   ├── 📦 pip-audit + npm audit (dependency CVEs)
   │   ├── 🏗️ Checkov (Terraform, K8s, Dockerfiles)
   │   ├── 🐳 Trivy (container OS + library CVEs)
   │   ├── 📋 SBOM generation (CycloneDX)
   │   ├── ⚖️ License compliance
   │   └── 📊 Security Summary
   │
   └── CD Pipeline (cd.yaml) — triggers AFTER CI passes
       ├── 🔒 Security Gate
       ├── Deploy to Kubernetes
       ├── Health Check
       └── Auto-rollback on failure
```

### Severity Policy

| Severity | Action | Examples |
|----------|--------|----------|
| **Secrets** | ❌ Hard block | API keys, passwords in code or images |
| **Critical CVE** | ❌ Block | Actively exploited vulnerabilities |
| **High CVE** | ⚠️ Warn | Exploitable with effort |
| **Medium/Low** | ℹ️ Info | Logged for review |
| **IaC misconfig** | ⚠️ Soft-fail | S3 without encryption, open security groups |

### Pre-commit Hooks (Local)

```bash
pip install pre-commit
pre-commit install
# Now Gitleaks, flake8, yamllint, Hadolint run before every commit
```

### Exception Management

False positives and accepted risks are documented in:
- `.gitleaks.toml` — secret scanning allowlist
- `ecommerce-platform/.trivyignore` — suppressed CVEs
- `ecommerce-platform/.semgrepignore` — excluded paths
- `ecommerce-platform/infra/.checkov-skip-reasons.md` — IaC skip rationale

See [SECURITY.md](../SECURITY.md) for the full security policy.

## Observability

- **Metrics**: Prometheus + Grafana
- **Logs**: Loki stack
- **Alerts**: Preconfigured alerting rules

---

## CI/CD Pipeline Errors & Fixes (Troubleshooting Log)

This section documents every error encountered while getting the CI/CD pipeline to pass, along with the root cause and exact fix. Use this as a learning reference.

---

### Error 1: Workflows Not Triggering on Push

**Symptom**: Pushed to GitHub but no pipeline runs appeared in the Actions tab.

**Root Cause (two issues)**:
1. GitHub Actions only reads workflow files from `.github/workflows/` at the **repository root**. Our workflows were inside `ecommerce-platform/.github/workflows/` — GitHub never saw them.
2. Workflows were set to trigger on `main`/`develop` branches, but the repo used `master`.

**Fix**: Copied workflows to the repo root and added `master` to branch triggers.

```yaml
# BEFORE (wrong branch names, wrong file location)
on:
  push:
    branches: [main, develop]

# AFTER (.github/workflows/ci.yaml at REPO ROOT)
on:
  push:
    branches: [master, main, develop]
```

All `working-directory` and `context` paths also needed the `ecommerce-platform/` prefix since workflows now ran from repo root:

```yaml
# BEFORE
working-directory: frontend

# AFTER
working-directory: ecommerce-platform/frontend
```

**Lesson**: GitHub Actions ONLY reads `.github/workflows/` from the repository root. Monorepo projects must place workflows at root and use relative paths to subdirectories.

---

### Error 2: CD Pipeline Fails — `secrets` in Job-Level `if:`

**Symptom**: CD workflow failed with a syntax/evaluation error on `if:` condition.

**Error**:
```
if: ${{ secrets.CONTROL_PLANE_IP != '' && secrets.EC2_SSH_KEY != '' }}
```

**Root Cause**: The `secrets` context **cannot be used in job-level `if:` conditions** in GitHub Actions. Secrets are only accessible within `steps`.

**Fix**: Moved the check into a dedicated step that passes secrets through `env:` and sets an output flag:

```yaml
- name: Check if deploy secrets are configured
  id: check
  run: |
    if [ -z "$CONTROL_PLANE_IP" ] || [ -z "$SSH_KEY" ]; then
      echo "skip=true" >> $GITHUB_OUTPUT
      echo "::warning::Skipping deploy — secrets not set"
    else
      echo "skip=false" >> $GITHUB_OUTPUT
    fi
  env:
    CONTROL_PLANE_IP: ${{ secrets.CONTROL_PLANE_IP }}
    SSH_KEY: ${{ secrets.EC2_SSH_KEY }}

# Then gate all subsequent steps:
- name: Deploy to Kubernetes
  if: steps.check.outputs.skip != 'true'
  run: ...
```

**Lesson**: Secrets are available in `steps[*].env` and `steps[*].run`, but NOT in job-level `if:` conditions. Use a "check" step with `env:` to expose them safely.

---

### Error 3: CD Pipeline — `ssh: Could not resolve hostname`

**Symptom**:
```
ssh: Could not resolve hostname : Name or service not found
scp: Connection closed
```

**Root Cause**: The `CONTROL_PLANE_IP` and `EC2_SSH_KEY` GitHub secrets weren't configured (no infrastructure deployed yet), so the hostname was an empty string.

**Fix**: Added the step-gating pattern from Error 2 so the CD deploy skips gracefully when secrets aren't set.

**Lesson**: Always guard deployment steps against missing configuration. Don't assume secrets exist.

---

### Error 4: npm Cache Fails — Missing `package-lock.json`

**Symptom**:
```
Error: Some specified paths were not resolved, unable to cache dependencies.
```

**Root Cause**: The `setup-node` action was configured with `cache: 'npm'` and `cache-dependency-path: .../package-lock.json`, but `package-lock.json` was never committed (only `package.json` existed).

**Fix**: Removed the `cache` options and switched from `npm ci` to `npm install`:

```yaml
# BEFORE
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: ecommerce-platform/frontend/package-lock.json
- run: npm ci || npm install

# AFTER
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: npm install
```

**Lesson**: `npm ci` requires `package-lock.json`. If you don't commit lock files, use `npm install` instead. The `cache` option in `setup-node` also requires the lock file to compute a cache key.

---

### Error 5: Flake8 Lint Errors — Unused Imports and Globals

**Symptom**:
```
app/main.py:9:1: F401 'app.config.settings' imported but unused
app/messaging.py:28:5: F824 `global _channel` is unused
app/messaging.py:46:5: F824 `global _connection` is unused
```

**Root Cause**:
- `settings` was imported in `main.py` but never referenced (only `engine`, `Base` etc. were used)
- `global _channel` / `global _connection` were declared in functions that only **read** module-level variables (no assignment). `global` is only needed when you **assign** to a module-level variable inside a function.

**Fix**:

```python
# BEFORE – main.py
from app.config import settings    # ← unused
from app.database import engine

# AFTER – main.py
from app.database import engine    # removed unused import
```

```python
# BEFORE – messaging.py
async def publish_message(routing_key, data):
    global _channel          # ← unnecessary, only reads _channel
    if not _channel: ...

async def close_rabbitmq():
    global _connection       # ← unnecessary, only reads _connection
    if _connection: ...

# AFTER – messaging.py (global removed from read-only functions)
async def publish_message(routing_key, data):
    if not _channel: ...     # reading module var is fine without global

async def close_rabbitmq():
    if _connection: ...
```

> Note: `connect_rabbitmq()` still keeps `global _connection, _channel` because it **assigns** to them.

**Lesson**: In Python, `global` is only needed when a function **assigns** to a module-level variable. Reading a module variable does NOT require `global`. Flake8's F824 catches this.

---

### Error 6: ESLint — No Configuration File Found

**Symptom**:
```
ESLint couldn't find a configuration file.
```

**Root Cause**: The Node.js services had `"lint": "eslint src/"` in `package.json`, but no `.eslintrc.json` config file existed.

**Fix**: Created `.eslintrc.json` for each service:

```json
// user-service/.eslintrc.json & product-service/.eslintrc.json
{
  "env": { "node": true, "es2021": true, "jest": true },
  "extends": "eslint:recommended",
  "parserOptions": { "ecmaVersion": "latest" },
  "rules": { "no-unused-vars": "warn", "no-console": "off" }
}
```

```json
// frontend/.eslintrc.json (React needs react-app config)
{
  "env": { "browser": true, "es2021": true, "jest": true },
  "extends": "react-app",
  "rules": { "no-unused-vars": "off" }
}
```

**Lesson**: ESLint requires a config file. For React projects using `react-scripts`, extend `"react-app"` (not `"eslint:recommended"`) to get proper JSX/React support.

---

### Error 7: Frontend ESLint — `'process' is not defined`, `'React' is defined but never used`

**Symptom**:
```
'process' is not defined              (api.js)
'React' is defined but never used     (App.js)
'Routes' is defined but never used    (App.js)
'Link' is defined but never used      (App.js)
```

**Root Cause**: Used `extends: "eslint:recommended"` for the frontend, which doesn't understand React/JSX. In JSX, `React`, `Routes`, `Link`, etc. are used in the template, not as direct JS references. `process.env` is a Node/webpack global that `eslint:recommended` doesn't know about.

**Fix**: Changed to `extends: "react-app"` which understands JSX usage:

```json
{
  "extends": "react-app"
}
```

**Lesson**: `eslint:recommended` is for plain JS. React projects need `react-app` (from `react-scripts`) or `plugin:react/recommended` to properly parse JSX.

---

### Error 8: Python Tests Fail — No PostgreSQL in CI

**Symptom**:
```
psycopg2.OperationalError: connection to server at "localhost", port 5432 failed: Connection refused
```

**Root Cause**: Tests imported the FastAPI app which created a SQLAlchemy engine pointing to `localhost:5432`. No Postgres database exists in the GitHub Actions runner.

**Fix**: Rewrote tests to use **SQLite in-memory** with FastAPI's dependency override:

```python
# BEFORE – tests/test_payments.py
from app.main import app
client = TestClient(app)               # hits real Postgres

# AFTER – tests/test_payments.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
from app.database import get_db
from app.main import app

# In-memory SQLite for CI
engine = create_engine("sqlite:///./test.db",
    connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)               # uses SQLite, no Postgres needed
```

**Lesson**: FastAPI's `dependency_overrides` lets you swap the DB session for tests. Use SQLite for CI to avoid needing a real database. This is a standard FastAPI testing pattern.

---

### Error 9: Frontend Test — `toBeInTheDocument is not a function`

**Symptom**:
```
TypeError: expect(...).toBeInTheDocument is not a function
```

**Root Cause**: The custom Jest matcher `toBeInTheDocument()` comes from `@testing-library/jest-dom`, which must be imported before tests run. The `setupTests.js` file (auto-loaded by `react-scripts`) was missing.

**Fix**: Created `src/setupTests.js`:

```javascript
// src/setupTests.js
import '@testing-library/jest-dom';
```

**Lesson**: `react-scripts` automatically loads `src/setupTests.js` before every test. This is where you import `@testing-library/jest-dom` to enable matchers like `toBeInTheDocument()`, `toHaveTextContent()`, etc.

---

### Error 10: Jest Hangs — Open Handles After Tests

**Symptom**:
```
Jest did not exit one second after the test run has completed.
This usually means there are asynchronous operations that weren't stopped.
```

**Root Cause**: The Express app starts a server (`app.listen()`), opens a pg Pool, and connects to Redis on import. These connections remain open after tests finish, preventing Jest from exiting.

**Fix**: Added `--forceExit` to the Jest command:

```json
{
  "scripts": {
    "test": "jest --coverage --forceExit"
  }
}
```

**Lesson**: When testing Express apps that start servers/connections on import, use `--forceExit` to prevent Jest from hanging. A cleaner alternative is to separate app creation from server startup and only import the app (not start listening) in tests.

---

### Error 11: Docker Build Fails — `npm ci` Without Lock File

**Symptom**:
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Root Cause**: Dockerfiles used `RUN npm ci` in build stages, but `package-lock.json` was not in the repository (only `package.json`).

**Fix**: Replaced `npm ci` with `npm install` in all Dockerfiles:

```dockerfile
# BEFORE
COPY package*.json ./
RUN npm ci

# AFTER
COPY package*.json ./
RUN npm install
```

Also fixed production stage:
```dockerfile
# BEFORE
RUN npm ci --production && npm cache clean --force

# AFTER
RUN npm install --omit=dev && npm cache clean --force
```

**Lesson**: `npm ci` is designed for reproducible builds from a lock file. If you don't commit `package-lock.json`, use `npm install`. For production Docker images, use `npm install --omit=dev` to skip devDependencies.

---

### Error 12: Docker Hub Login — Missing `DOCKER_PASSWORD` Secret

**Symptom**:
```
Error: Password required
```

**Root Cause**: The `docker/login-action@v3` step needed `${{ secrets.DOCKER_PASSWORD }}`, but the secret wasn't configured in GitHub.

**Fix**: Set the secret via GitHub CLI:

```bash
gh secret set DOCKER_PASSWORD --body "Amazon1Seller@@"
```

**Lesson**: Always set required GitHub Secrets before running workflows that depend on them. Use `gh secret set` or go to **Settings → Secrets and variables → Actions** in your GitHub repo.

---

### Summary: Error Resolution Timeline

| # | Error | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Workflows not triggering | Wrong location + wrong branch name | Move to repo root, add `master` |
| 2 | `secrets` in job `if:` | Secrets not available at job level | Use step with `env:` + output flag |
| 3 | SSH hostname empty | Secrets not configured | Gate steps on secret existence |
| 4 | npm cache fails | No `package-lock.json` | Remove cache, use `npm install` |
| 5 | Flake8 F401/F824 | Unused import + unnecessary `global` | Remove unused code |
| 6 | ESLint no config | Missing `.eslintrc.json` | Create config files |
| 7 | React lint errors | Wrong ESLint preset | Use `react-app` instead of `eslint:recommended` |
| 8 | Postgres connection refused | No DB in CI runner | SQLite + dependency override |
| 9 | `toBeInTheDocument` undefined | Missing `setupTests.js` | Import `@testing-library/jest-dom` |
| 10 | Jest hangs | Open server/DB handles | `--forceExit` flag |
| 11 | Docker `npm ci` fails | No lock file | Use `npm install` |
| 12 | Docker login fails | Missing secret | `gh secret set DOCKER_PASSWORD` |

---

## License

MIT
