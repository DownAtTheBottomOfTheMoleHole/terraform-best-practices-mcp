# GitHub Personal Access Token Setup

## Why is this needed?

The release workflow can create and push version/tag updates, publish artifacts, and create GitHub releases. Most flows work with the default `GITHUB_TOKEN`, but some organizations prefer a dedicated Personal Access Token (PAT) for explicit workflow permissions.

## Setup Instructions (Optional)

### 1. Create a Fine-Grained Personal Access Token

1. Go to **Settings** -> **Developer settings** -> **Personal access tokens** -> **Fine-grained tokens**
2. Click **Generate new token**
3. Configure the token:
   - **Token name**: `Terraform Best Practices MCP Release Workflow`
   - **Expiration**: Choose your preference (90 days or custom)
   - **Repository access**: Select "Only select repositories" -> Choose `terraform-best-practices-mcp`
   - **Repository permissions**:
     - **Contents**: Read and write
     - **Metadata**: Read-only (automatically selected)
     - **Workflows**: Read and write

4. Click **Generate token**
5. Copy the token immediately (you will not be able to see it again)

### 2. Add Token to Repository Secrets

1. Go to your repository -> **Settings** -> **Secrets and variables** -> **Actions**
2. Click **New repository secret**
3. Name: `PAT_TOKEN`
4. Value: Paste your token
5. Click **Add secret**

### 3. Verify the Setup

Merge a PR to the `main` branch and verify:

1. The publish workflow runs successfully
2. Publishing to npm and MCP Registry completes
3. A GitHub Release is created

## Workflow Behavior

### With PAT_TOKEN configured

```text
Push/merge to main -> release workflow runs -> npm + MCP Registry publish -> GitHub Release created
```

### Without PAT_TOKEN (default)

```text
Push/merge to main -> release workflow runs -> npm + MCP Registry publish -> GitHub Release created
```

## Security Notes

- Scope the token to this repository only
- Use least privilege (contents + workflows)
- Rotate tokens before expiration
- Never commit tokens to source control

## Troubleshooting

Problem: Publishing fails with authentication error

- Solution: Verify npm Trusted Publisher and MCP Registry auth configuration

Problem: GitHub release is not created

- Solution: Check workflow logs in the Actions tab for exact failure details

Problem: Token expired

- Solution: Generate a new token and update the `PAT_TOKEN` secret
