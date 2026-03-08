# Testing Terraform Best Practices MCP Server

This document describes repeatable tests for the Terraform Best Practices MCP server.

## Dependencies for Testing

- Node.js `>=24.0.0`
- npm
- Optional CLIs for tool-backed checks:
  - `tflint`
  - `checkov`
  - `trivy`
  - `kics`
  - `infracost`

## Prerequisites

1. Build the server:

   ```bash
   npm run build
   ```

2. Reload VS Code so MCP config is reloaded:

   - `Cmd+Shift+P` -> `Developer: Reload Window`

## Copilot Chat Validation

Use your configured server alias in Copilot Chat (for example `@terraform-best-practices-mcp`).

### Test 1: Analyze Terraform code quality

```text
Analyze Terraform code for modularity issues and suggest refactoring options.
```

Expected: Structured findings for module boundaries, naming consistency, and maintainability.

### Test 2: Generate cost report

```text
Generate a Terraform cost report and highlight optimization opportunities.
```

Expected: Cost-oriented summary with actionable optimization recommendations.

### Test 3: Security hardening guidance

```text
Suggest security hardening actions for Terraform code handling IAM, networking, and secrets.
```

Expected: Prioritized security recommendations and risk categories.

### Test 4: Compliance summary

```text
Generate a compliance summary from recent Terraform scan results.
```

Expected: Consolidated compliance output with pass/fail style categorization.

### Test 5: Architecture recommendation

```text
Suggest a Terraform architecture for multi-environment and multi-region deployment.
```

Expected: Architecture pattern recommendation with tradeoffs.

### Test 6: State management analysis

```text
Analyze Terraform state management and suggest backend/locking improvements.
```

Expected: State safety findings around remote state, locking, and team workflows.

## Unit Tests

Run the test suite:

```bash
npm test
```

## Lint and Build Validation

```bash
npm run lint
npm run build
```

## Troubleshooting

### Tool binary not found

- Ensure required CLI tools are installed and available in `PATH`
- Re-run with optional tools removed from the request to validate core server behavior

### Server not visible in Copilot Chat

- Verify `.vscode/mcp.json` exists
- Reload VS Code window
- Check `Output` -> `MCP Servers` for startup errors

### Build failures

- Reinstall dependencies: `npm install`
- Re-run checks: `npm run check`
- Rebuild: `npm run build`
