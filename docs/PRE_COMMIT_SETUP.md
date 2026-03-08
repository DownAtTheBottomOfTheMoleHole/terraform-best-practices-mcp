# Pre-commit Setup Guide

This project uses [pre-commit](https://pre-commit.com/) to enforce code quality checks before commits.

## Installation

1. Install pre-commit:

   ```bash
   pip install pre-commit
   ```

2. Set up git hooks:

   ```bash
   pre-commit install
   ```

## Usage

Pre-commit hooks automatically run on `git commit`. To run hooks on all files:

```bash
pre-commit run --all-files
```

To run a specific hook:

```bash
pre-commit run eslint --all-files
pre-commit run typescript-check --all-files
```

## Hooks

- Whitespace and file checks: trailing whitespace, EOF fixers, merge conflict detection, large file detection, private key detection
- Markdown linting: validates markdown formatting with `.markdownlintrc.json`
- YAML linting: validates YAML syntax and formatting
- ESLint: TypeScript linting using local project config
- TypeScript check: `npm run check`

## Configuration

- Hooks are defined in `.pre-commit-config.yaml` with pinned versions
- Markdown rules are in `.markdownlintrc.json`
- YAML rules are inline in `.pre-commit-config.yaml`

## CI Integration

Pre-commit runs locally on developer machines. CI still runs the full validation suite (lint, tests, build, and release checks).
