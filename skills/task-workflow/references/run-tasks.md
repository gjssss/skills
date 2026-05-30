# Run Tasks

Use this workflow when the user asks to run, execute, or orchestrate existing numbered Markdown task files.

## Workflow

1. Identify the task folder from the user request. If missing, ask for it before continuing.
2. Identify the optional start number, such as "from 2", "task 2", or "从 2 号任务开始".
3. Check that Bun is available before running the bundled script:

```bash
command -v bun >/dev/null
```

If Bun is missing, stop and ask the user to install it; do not install it automatically.

4. Before reading task contents or creating subagents, run `group`:

```bash
bun <skill-dir>/scripts/task_workflow.ts group <task-dir> [--from <number>]
```

5. If the script exits non-zero, stop. Report the failure reason and do not read task files or create subagents.
6. If it succeeds, parse the JSON output. It is an array of task groups ordered by numeric prefix.
7. Process groups serially from first to last.
8. Within one group, launch one subagent per task file in parallel when subagents are available. If subagents are unavailable, run the files one by one but do not start the next numbered group early.
9. Read each task file before launching its execution. Include the task path and full Markdown content in the prompt.
10. Tell every executor it is not alone in the codebase, must not revert edits made by others, and must adapt to concurrent changes.
11. If any task fails or reports incomplete work, stop before the next group and summarize completed tasks, failed tasks, and the failure reason.

## Group Validation

`group` is strict and is the source of truth for execution:

- Scan only the first level of the task folder, not subdirectories.
- Every first-level entry must be a regular `.md` file.
- Every filename must match `<number>.<task_name>.md`.
- Number prefixes are parsed as integers, so `1.foo.md` and `01.bar.md` are in the same group.
- `--from <number>` keeps only groups whose parsed number is greater than or equal to the start number.
- Empty folders, invalid `--from` values, non-markdown files, directories, and invalid names are hard failures.
