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
11. Tell every executor to commit its completed task automatically when its work is done and the working directory is inside a Git repository. If the task is not inside a Git repository, skip the commit and report that no Git repository was found.
12. If any task fails, reports incomplete work, or cannot safely commit task-owned changes in a Git repository, stop before the next group and summarize completed tasks, failed tasks, committed tasks, uncommitted tasks, and the failure reason.

## Git Commit Behavior

When a task completes successfully:

- Detect whether the task work happened inside a Git repository with `git rev-parse --show-toplevel`.
- If there is no Git repository, do not treat that as a task failure; skip the commit and report it.
- Commit only changes owned by the completed task. Do not stage or commit unrelated pre-existing user edits or changes from other concurrent tasks.
- Prefer staging explicit task-owned paths with `git add -- <paths>`. Avoid broad staging commands such as `git add -A` unless the executor has confirmed every changed path belongs to the completed task.
- If the executor cannot distinguish task-owned changes from unrelated dirty work, do not commit. Treat that as an unsafe commit condition and stop before the next numbered group.
- If the task produced no Git changes, skip the commit and report that there was nothing to commit.
- Use a concise commit message: `task-workflow: complete <task-file-name>`.
- Do not push unless the user explicitly requested pushing.

## Group Validation

`group` is strict and is the source of truth for execution:

- Scan only the first level of the task folder, not subdirectories.
- Every first-level entry must be a regular `.md` file.
- Every filename must match `<number>.<task_name>.md`.
- Number prefixes are parsed as integers, so `1.foo.md` and `01.bar.md` are in the same group.
- `--from <number>` keeps only groups whose parsed number is greater than or equal to the start number.
- Empty folders, invalid `--from` values, non-markdown files, directories, and invalid names are hard failures.
