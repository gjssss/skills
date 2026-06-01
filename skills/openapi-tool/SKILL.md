---
name: openapi-tool
description: Parse and inspect OpenAPI or Swagger-style API documents with a bundled Bun CLI. Use when Codex needs to list APIs, search endpoints by keyword, inspect request or response schemas, read parameters, tags, operationId, descriptions, or get details from local or remote OpenAPI 3.0/3.1 JSON/YAML documents.
---

# OpenAPI Tool

Use the bundled CLI to inspect OpenAPI documents deterministically instead of manually parsing large JSON/YAML files.

## Preflight

Check that Bun is available before running the CLI:

```bash
command -v bun >/dev/null || {
  echo "Bun is required to run this script. Install Bun from https://bun.com/ and retry." >&2
  exit 1
}
```

Run all commands from this skill directory, or pass the absolute path to `scripts/openapi.mjs`.

## Inputs

Use exactly one source option:

```bash
bun scripts/openapi.mjs list --file <path>
bun scripts/openapi.mjs list --remote <url>
```

- Use `--file` or `-f` for a local OpenAPI JSON/YAML document.
- Use `--remote` or `-r` for a remote OpenAPI JSON/YAML URL.
- Do not pass both source options.
- Remote documents are fetched with HTTP GET and no auth headers.

## List APIs

Use `list` when the user needs an overview or you need to locate an endpoint index:

```bash
bun scripts/openapi.mjs list --file <path> --page 0 --size 10
bun scripts/openapi.mjs list --remote <url> --keyword user --keyword create
```

Behavior:

- Output is JSON.
- Deprecated operations are omitted.
- `index` starts at 0 and is stable for use with `get`.
- Multiple `--keyword` values use OR matching.
- Keyword matching is case-sensitive and literal, not regex.
- Keywords match path, API name, description, tags, and operationId.

## Get API Details

Use `get <index>` when the user asks about request formats, response formats, schemas, parameters, tags, operationId, or a specific endpoint:

```bash
bun scripts/openapi.mjs get <index> --file <path>
bun scripts/openapi.mjs get <index> --remote <url>
```

The returned JSON includes the operation metadata and resolved request/response details where possible. The CLI supports OpenAPI 3.0/3.1, JSON/YAML, internal refs, external local refs, external remote refs, and recursive filtering of `deprecated: true`.

## Response Practice

- Summarize the CLI JSON into a concise human-readable answer unless the user asks for raw JSON.
- For endpoint discovery, show the matching index, method, path, name, tags, and operationId.
- For endpoint details, include request parameters/body and response status/schema information relevant to the user's question.
- If the CLI returns structured JSON errors, preserve the error code and explain the cause plainly.
