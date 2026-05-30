# Create Tasks

Use this workflow when the user asks to generate numbered Markdown task files.

## Workflow

1. Identify the task folder from the user request. If missing, ask for it before continuing.
2. Check that Bun is available before running the bundled script:

```bash
command -v bun >/dev/null
```

If Bun is missing, stop and ask the user to install it; do not install it automatically.

3. Run `inspect` before writing task files:

```bash
bun <skill-dir>/scripts/task_workflow.ts inspect <task-dir> [--number <positive-int>] [--create]
```

4. Use `--create` when the user provided a folder that does not exist.
5. Use `--number <n>` when the user specified a starting task number.
6. If no number is specified, use the returned `startNumber`.
7. If the user explicitly provides a task split, follow it.
8. If no split is provided, split the request into a small number of atomic tasks, usually 1-4 and no more than 5 unless explicitly requested.

## Numbering And Naming

- Use increasing numbers for dependent serial tasks.
- Use the same number with different slugs for tasks that can run in parallel.
- Write filenames as `<number>.<slug>.md`; do not zero-pad by default.
- Use short lowercase ASCII kebab-case slugs.

## Task Content

Write each task with exactly these sections:

```markdown
## 功能目标

## 开发范围与设计

## 测试与验收
```

Keep each task concise and standard. Each task must include its own implementation scope and test/acceptance work. Do not create a separate "final verification" task that tests other tasks collectively.

After creating task files, return the absolute paths and ask whether the user wants to execute them now.

## Inspect Behavior

`inspect` is permissive for generation:

- It creates the folder only when `--create` is passed.
- It ignores invalid first-level entries when calculating `startNumber`.
- It reports invalid entries in `warnings`; warn the user that those entries will block later `group` execution.
