# AGENTS.md

## 工作约定

1. 新建 skill 时，将完整 skill 目录放在仓库根目录的 `skills/` 文件夹中。
2. 查找、选择、更新或复用 skill 时，先从 `skills/` 文件夹中检索现有 skill。
3. `skills/` 目录下的每个 skill 都必须能够独立分发和独立使用。单个 skill 文件夹应当可以被提取、复制到另一个项目中，或在不加载本仓库其他内容的情况下单独加载。
4. Never link from SKILL.md or its references/ to files outside the skill's own directory.
5. 仓库内脚本默认使用 Bun 编写和运行；运行脚本前先检查当前环境是否有 `bun`。
6. 如果当前环境没有 `bun`，提醒用户从 https://bun.com/ 安装，不要自动运行安装命令。
7. 脚本测试使用 Vitest；新增或修改脚本时同步补充 `tests/` 下的 Vitest 测试。
