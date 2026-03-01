# Project Guidelines — AI Coding Agents

This repository currently contains minimal content (a [LICENSE](LICENSE)) and no detected source code, build scripts, or tests. The instructions below are tailored to help an AI coding agent be immediately useful while minimizing assumptions.

## How to behave
- **Discover first:** Run a workspace search for language files, build config, and CI before making changes. If nothing is found, report that and ask the user for next steps.
- **Ask before heavy changes:** For new services, languages, or adding major dependencies, ask the user for approval and intended runtime environment.
- **Prefer patches over guesses:** Produce edits as a small, focused patch (`apply_patch`) and include a short rationale in the PR/commit message.

## Code style
- **No project-level style files detected.** When adding code, include formatter/config files (e.g., `pyproject.toml`, `.eslintrc`, or `.prettierrc`) and follow those. If none are provided, use widely-adopted defaults and document your choice in the change.

## Architecture / Project layout
- **No existing architecture to reference.** When proposing new structure, include a concise README section describing component responsibilities and where new files are placed.

## Build & test
- **No build or test commands detected.** Do not run automated installs or tests without the user's permission. If you add code, include explicit install and test commands in `README.md` (examples below) and update this file.

Examples to add when introducing Node or Python code:
- Node: `npm install` then `npm test`
- Python: `python -m venv .venv`, `pip install -r requirements.txt`, then `pytest`

## Project conventions
- Keep changes minimal and self-contained. Each change should include a README update and at least one test when adding behavior.
- Use clear commit messages and a short PR description that lists the files changed and why.

## Integration & security
- There are no detected external integrations. Never add credentials or secrets to the repository. If an integration is required, request secure approval and instructions for secret management.

## When you finish a change
- Run available tests (if any) and include the exact commands used in the PR description.
- Update this file with any new discovered conventions (formatters, test commands, CI).

If anything above is unclear or you want this tailored for a specific language or CI provider, tell me which language or toolchain to target and I'll update this file accordingly.
