# Run Tasks

Use this workflow when the user asks to run, execute, or orchestrate existing numbered Markdown task files.

## Workflow

1. Identify the task folder from the user request. If missing, ask for it before continuing.
2. Identify the optional start number, such as "from 2", "task 2", or "从 2 号任务开始".
3. Before reading task contents or creating subagents, run `group`:

```bash
node <skill-dir>/scripts/task_workflow.mjs group <task-dir> [--from <number>]
```

4. If the script exits non-zero, stop. Report the failure reason and do not read task files or create subagents.
5. If it succeeds, parse the JSON output. It is an array of task groups ordered by numeric prefix.
6. Process groups serially from first to last.
7. Within one group, launch one subagent per task file in parallel when subagents are available. If subagents are unavailable, run the files one by one but do not start the next numbered group early.
8. Read each task file before launching its execution. Include the task path and full Markdown content in the prompt.
9. Tell every executor it is not alone in the codebase, must not revert edits made by others, and must adapt to concurrent changes.
10. If any task fails or reports incomplete work, stop before the next group and summarize completed tasks, failed tasks, and the failure reason.

## Group Validation

`group` is strict and is the source of truth for execution:

- Scan only the first level of the task folder, not subdirectories.
- Every first-level entry must be a regular `.md` file.
- Every filename must match `<number>.<task_name>.md`.
- Number prefixes are parsed as integers, so `1.foo.md` and `01.bar.md` are in the same group.
- `--from <number>` keeps only groups whose parsed number is greater than or equal to the start number.
- Empty folders, invalid `--from` values, non-markdown files, directories, and invalid names are hard failures.
