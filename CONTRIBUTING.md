# Contributing to TriNetra

Thank you for contributing to TriNetra (त्रिनेत्र) for the Smart India Hackathon 2026. This guide details our team Git workflow, branch naming conventions, change ownership, and AI coding agent guidelines.

---

## 1. Branch Strategy

```text
main
 ├── feature/foundation-...  (Deepjyot)
 ├── feature/ocr-...         (OM)
 ├── feature/rules-...       (Mohit)
 └── feature/frontend-...    (Dev)
```

### Git Rules
1. **Do not push directly to `main`:** All code changes must go through a feature branch and pull request.
2. **Create a feature branch:** Use clear branch prefixes:
   - `feature/ocr-paddle-integration`
   - `feature/rules-dual-mrp`
   - `feature/frontend-inspection-ui`
   - `fix/image-upload-mime`
3. **Keep commits focused and atomic:** Do not bundle unrelated bug fixes with new feature additions.
4. **Pull latest `main` regularly:** Always fetch and rebase/merge `main` before starting substantial new work.
5. **Resolve conflicts on your own branch:** Never push merge conflicts or untested resolution commits to shared branches.
6. **Run tests before opening a PR:** `pytest -v` must report 100% passing tests.
7. **Open PR into `main`:** Provide a concise summary of changes, tested edge cases, and any required database migrations.
8. **Code review:** Obtain at least one approval from the subsystem owner before merging.
9. **Never commit `.env`:** The `.gitignore` file strictly ignores `.env`.
10. **Never commit secrets or passwords:** Do not put real API keys, passwords, or JWT secrets in code or documentation.
11. **Do not change shared architecture casually:** Architectural mutations require team alignment.
12. **Do not change API contracts without discussion:** Breaking changes to `/api/*` will break the frontend client.
13. **Respect Subsystem Ownership:** Do not modify another team member's subsystem without coordinating.

---

## 2. Team Subsystem Ownership

| Team Member | Subsystem Ownership | Key Responsibilities |
|---|---|---|
| **Deepjyot** | Core Architecture & Integration | Backend foundation, DB models, Alembic migrations, Auth/RBAC, API contracts, system integration |
| **OM** | Vision & OCR Pipeline | `BaseOCRService`, PaddleOCR integration, image quality scoring, declaration isolation & bounding boxes |
| **Mohit** | Rule Engine & Compliance | Legal Metrology rule modules, statutory citations, RuleRegistry, legal validation |
| **Dev** | Frontend & UI/UX | React application, Vite build, Tailwind/shadcn UI, inspection scanning dashboard, API consumption |

*These boundaries designate primary ownership and code review responsibility; they are not barriers to collaboration.*

---

## 3. AI Coding Agent Policy

Every AI coding agent (e.g. Gemini, Antigravity, Claude, Copilot) operating on this repository **MUST** read and obey:
1. [docs/AI_CONTEXT.md](file:///d:/legal-metrolgy-checker/docs/AI_CONTEXT.md)
2. [docs/ARCHITECTURE.md](file:///d:/legal-metrolgy-checker/docs/ARCHITECTURE.md)

### Key Rules for AI Agents:
- **Preserve Existing Contracts:** Do not break existing API routes, schemas, or database models unless explicitly instructed.
- **No Heavy Infrastructure Creep:** Do not introduce microservices, Redis, Kafka, Kubernetes, vector databases, or LLM agents.
- **Deterministic Rules Only:** Compliance verdicts must remain deterministic in Python. Do not delegate legal decisions to an LLM.
- **Maintain Test Suite:** Always run `pytest -v` after modifying code.
