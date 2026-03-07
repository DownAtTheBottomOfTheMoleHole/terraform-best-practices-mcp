# terraform-best-practices-mcp

An MCP server that helps teams produce better Terraform by combining:

- CLI analysis: `tflint`, `checkov`, `trivy`, `kics`, `infracost`
- Best-practice retrieval from `terraform-best-practices.com`
- Cloud provider guidance for `azure`, `aws`, and `gcp`
- Terraform Registry guidance for providers/resources/modules

## Tool Catalog

### CLI-Backed Analysis Tools

- `run_tflint` — Lint Terraform code
- `run_checkov` — Security and compliance scanning
- `run_trivy` — Configuration scanning for vulnerabilities
- `run_kics` — IaC scanning for security and compliance
- `run_infracost` — Cloud cost estimation

### Guidance & Best-Practice Tools

- `fetch_terraform_best_practices` — Fetch curated Terraform best practices
- `fetch_provider_best_practices` — Cloud provider (Azure/AWS/GCP) Terraform guidance
- `fetch_terraform_registry_guidance` — Registry guidance for providers/resources/modules

### Interactive Analysis & Reporting Tools

- `analyze_terraform_code` — Analyze code structure, modularity, and best practices
- `generate_cost_report` — Generate cost analysis with optimization suggestions
- `suggest_security_hardening` — Provide security hardening recommendations
- `generate_compliance_summary` — Create compliance reports from scan outputs

## Prerequisites

- Node.js 24+
- Optional CLIs available on `PATH` for command tools:
  - `tflint`
  - `checkov`
  - `trivy`
  - `kics`
  - `infracost`

If a CLI is missing, the server returns installation guidance instead of failing silently.

## Setup

```bash
npm install
npm run build
```

## Run

```bash
npm run dev
```

For production-style execution:

```bash
npm run build
npm start
```

## Publish

This package is configured for npm as:

- `@downatthebottomofthemolehole/terraform-best-practices-mcp-server`

To publish:

```bash
npm publish --access public
```

## MCP Configuration

This project includes `.vscode/mcp.json`:

```json
{
  "servers": {
    "terraform-best-practices-mcp": {
      "type": "stdio",
      "command": "npm",
      "args": ["run", "dev"]
    }
  }
}
```

Registry metadata files used by your other MCP repos are also included:

- `mcp.json`
- `server.json`

## References

- [MCP org](https://github.com/modelcontextprotocol)
- [MCP docs](https://modelcontextprotocol.io/docs)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [terraform-best-practices](https://www.terraform-best-practices.com/)
- [Terraform Registry](https://registry.terraform.io/)
