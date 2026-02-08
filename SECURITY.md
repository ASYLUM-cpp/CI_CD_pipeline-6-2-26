# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ Active           |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email: [security contact — update this]
3. Include: description, steps to reproduce, potential impact
4. Expected response time: 48 hours

## Security Scanning

This project runs automated security scanning on every push:

| Layer | Tool | What It Checks | Policy |
|-------|------|----------------|--------|
| Secrets | Gitleaks | API keys, passwords, tokens in git history | **Block** |
| SAST | Semgrep | SQL injection, XSS, auth bypass, insecure patterns | Warn |
| Dependencies (Python) | pip-audit | Known CVEs in pip packages | **Block** on Critical |
| Dependencies (Node) | npm audit | Known CVEs in npm packages | **Block** on Critical |
| Infrastructure | Checkov | Terraform, K8s, Dockerfile misconfigurations | Warn (soft-fail) |
| Containers | Trivy | OS & library CVEs in Docker images | **Block** on Critical |
| Containers | Trivy | Secrets baked into images | **Block** |
| Supply Chain | Trivy SBOM | Software Bill of Materials generation | Info |
| Licensing | license-checker / pip-licenses | GPL/AGPL/copyleft detection | Warn |

## Severity Policy

| Severity | Action | Rationale |
|----------|--------|-----------|
| **Critical** | Pipeline blocked | Actively exploited or trivially exploitable |
| **High** | Warning + review required | Exploitable with some effort |
| **Medium** | Warning | Logged for next sprint |
| **Low** | Info only | Tracked, not actioned immediately |

## Exception Process

When a scanner reports a false positive or an accepted risk:

1. Document the finding in the appropriate config file:
   - Gitleaks: `.gitleaks.toml` (allowlist)
   - Trivy: `ecommerce-platform/.trivyignore`
   - Checkov: `infra/.checkov-skip-reasons.md`
   - Semgrep: `ecommerce-platform/.semgrepignore` or inline `# nosemgrep`
2. Include a comment explaining **why** it's safe
3. Set a review date (max 90 days)
4. Get approval from a second team member

## Pre-commit Hooks

Developers should install local hooks:

```bash
pip install pre-commit
pre-commit install
```

This runs Gitleaks, flake8, yamllint, and Hadolint before every commit.

## Dependencies

- Dependencies are audited on every push and weekly (Monday 6 AM UTC)
- SBOMs are generated for every service and stored as pipeline artifacts
- License compliance is checked to prevent copyleft contamination
