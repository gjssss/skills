---
name: task-workflow
description: Create and run numbered Markdown task workflows only when the user explicitly invokes $task-workflow or asks to use the task workflow skill. Use for generating atomic task files in a folder, continuing task numbering, or executing numbered task files serially by number and in parallel within the same number.
---

# Task Workflow

Use this skill only for explicit task workflow requests. It manages Markdown task files named `<number>.<slug>.md`, where numbers define execution order and same-number files are independent parallel work.

## Route

Read only the workflow document needed for the user's requested work:

- To create or generate task files, read `references/create-tasks.md`.
- To run, execute, or orchestrate existing task files, read `references/run-tasks.md`.
- If the user asks to create tasks and then run them, read `references/create-tasks.md` first. After task creation, ask whether to execute; read `references/run-tasks.md` only if execution is requested.

## Script

```bash
command -v bun >/dev/null
bun <skill-dir>/scripts/task_workflow.ts <command> ...
```

Resolve `<skill-dir>` to this skill folder. Do not hard-code an absolute user path.
Before running the script, check that `bun` exists. If it is missing, stop and ask the user to install Bun; do not install it automatically.

```bash
bun <skill-dir>/scripts/task_workflow.ts inspect <task-dir> [--number <positive-int>] [--create]
bun <skill-dir>/scripts/task_workflow.ts group <task-dir> [--from <positive-int>]
```
