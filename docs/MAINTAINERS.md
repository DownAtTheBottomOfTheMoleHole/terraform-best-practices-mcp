# Maintainer Guide

This guide contains operational details for release management, compliance, and automation.

## Release Publishing

Publishing is automated via GitHub Releases and the GitVersion workflow.

1. Merge approved changes into `main`.
2. Push triggers `.github/workflows/publish-mcp.yml`.
3. GitVersion computes the next version based on commit messages.
4. Package is published to npm and MCP Registry if checks pass.

## Compliance Gate

The publish workflow enforces multiple jobs:

- `version-and-tag`: Computes version using GitVersion (patch by default)
- `test-and-build`: Runs linting, tests, builds
- `publish`: Runs only if all checks succeed

This blocks non-compliant releases.

## CI and Automation

Primary workflow files:

- `.github/workflows/publish-mcp.yml`

CI validates:

- type checks (TypeScript)
- unit tests (vitest)
- linting (eslint)
- build output
- markdown link checks
- npm audit

## GitVersion Configuration

See [GitVersion.yml](../GitVersion.yml) for version bump rules:

- Merge commits to `main`: Patch bump (default)
- Prefix `+semver: major` or `+semver: breaking`: Major bump
- Prefix `+semver: minor` or `+semver: feature`: Minor bump
- Prefix `+semver: patch` or `+semver: fix`: Patch bump
- Prefix `+semver: none` or `+semver: skip`: No version change

## Renovate Policy

[renovate.json](../renovate.json) controls dependency updates.

Current behaviour:

- patch updates: auto-merge
- minor updates: auto-merge
- major updates: manual review
- security updates: manual review

## Local Maintainer Checks

Run before committing:

```bash
npm run build
npm test
npm run lint
npm audit --production
```
