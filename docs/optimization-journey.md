# Super JSON Editor 优化心得

> 从一个单文件 HTML 到一个完整的现代化 Web 应用 + Agent Skill 的全过程记录。

---

## 一、项目演进总览

Super JSON Editor 起初是一个单 HTML 文件，用 Monaco Editor 做嵌套 JSON 的解析和编辑。经过持续迭代，演变为：

```
单文件 HTML (v1)
  → React + Vite 现代架构 (v2)
  → CI/CD + Preview 部署
  → present-json Agent Skill
  → Gzip 压缩优化 + 跨平台支持
```

## 二、性能优化篇

### 2.1 Tab 切换性能

**问题**：多文档 Tab 切换有明显延迟，用户体验差。

**优化手段**：
- **懒加载编辑器**：Layer Editor 只在用户点击对应 Tab 时才创建 Monaco 实例，避免初始化时一次性创建所有编辑器
- **DOM 缓存**：Tab 元素缓存复用，减少 reflow/repaint
- **批量 DOM 更新**：使用 `requestAnimationFrame` 将多次 DOM 操作合并为一次
- **防抖保存**：`debounce(saveDocumentsToStorage, 300ms)` 避免频繁写 localStorage

**效果**：Tab 切换从肉眼可见的延迟优化到即时响应。

### 2.2 Monaco 长行渲染

**问题**：JSON 经常出现超长单行（压缩后的 JSON），Monaco Editor 在渲染时会卡顿。

**解决**：调整 Monaco 配置，启用 word wrap，优化滚动渲染策略。

### 2.3 双向同步防死循环

**问题**：Layer 之间的父子关系需要双向同步——改了子层要更新父层，改了父层也要更新子层。天然存在循环更新风险。

**解决**：引入 `isUpdating` flag，在同步过程中锁住，防止 A→B→A 的循环触发。同时保存编辑器光标位置，同步后恢复，避免用户编辑位置跳动。

## 三、架构重构篇

### 3.1 从单文件到模块化

**v1 痛点**：所有逻辑在一个 index.html 里，1000+ 行 JS，维护困难。

**v2 方案**：
- React + TypeScript + Vite
- 组件拆分：MainLayout → InputPanel / LayerEditor / OutputPanel
- 状态管理：Hook-based (useSimpleImport, 等)
- 工具函数独立：`src/utils/simpleShare.ts` 等

**关键原则**：渐进式重构，不一次全改，每次提交保持可运行。

### 3.2 CI/CD Preview 部署

**演进过程**（这一段走了不少弯路）：

```
GitHub Pages Artifact API (失败：配置复杂)
  → gh-pages 分支部署 (成功)
  → 按分支名部署 Preview (/preview/{branch-name}/)
  → 自动清理已删除分支的 Preview 文件
  → Page title 显示分支名
```

**踩坑记录**：
1. GitHub Pages 的 Artifact 部署方式需要 `environment` 配置，文档不清楚，试了好几次
2. 最终选择直接 push 到 `gh-pages` 分支，用 `keep_files` 选项保留主站内容
3. 分支名含 `/` 时正则匹配出错，需要特殊处理

**心得**：CI/CD 配置不要追求一步到位，先跑通最简单的，再逐步加功能。

## 四、URL 分享与压缩篇

这是本分支（`compress-json-before-base64`）的核心工作。

### 4.1 需求背景

用户希望能把 JSON 数据通过 URL 分享，打开链接就能直接在编辑器里看到数据。数据全部编码在 URL 里，不需要后端。

### 4.2 编码方案演进

| 版本 | 参数 | 方案 | 压缩率 |
|------|------|------|--------|
| v1 | `?s=` | LZ-String | 基准 |
| v2 | `?r=` | 原始 Base64url | 无压缩，Shell 友好 |
| v3 | `?c=` | **Gzip + Base64url** | 比 `?r=` 缩短 50-70% |

### 4.3 Gzip 压缩方案细节

**Shell 侧（编码）**：
```bash
echo -n "$JSON" | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n'
```

三步管道：JSON → gzip 压缩 → base64 编码 → base64url 字符替换。

**浏览器侧（解码）**：
```typescript
// base64url → bytes → DecompressionStream('gzip') → UTF-8 string
const ds = new DecompressionStream('gzip')
```

利用浏览器内置的 `DecompressionStream` API，零依赖解压。

**为什么选 Gzip 而不是 LZ-String？**
- LZ-String 压缩率不错，但它的 `compressToEncodedURIComponent` 输出不是标准格式，Shell 里没法用
- Gzip 是标准工具，macOS/Linux 自带 `gzip` 命令，Shell 脚本里一行搞定
- 浏览器原生支持 DecompressionStream，不需要额外依赖
- 压缩率在 JSON 这种高冗余文本上非常好（50-70%）

### 4.4 Base64url vs 标准 Base64

URL 里不能用 `+` `/` `=`，所以需要 base64url 变体：
- `+` → `-`
- `/` → `_`
- 去掉尾部 `=` padding（解码时补回来）

Shell 里用 `tr '+/' '-_' | tr -d '='` 实现转换。

## 五、跨平台篇

### 5.1 present-json Skill 的跨平台之旅

**目标**：让 Agent 能在任何平台上调用 `/present-json` 把 JSON 数据展示给用户。

**演进过程**：

```
v1: 打印 URL（用户需要手动复制粘贴）
v2: 写临时 HTML → 用 open/xdg-open 打开浏览器（仅 macOS/Linux）
v3: 加 Windows PowerShell 支持（present.ps1）
v4: 加临时文件清理
v5: 合并 open + cleanup 为单一脚本
```

### 5.2 Windows 踩坑

1. **临时文件不自动清理**：Linux 的 `/tmp` 重启后清空，Windows 的 `$env:TEMP` 不会。需要手动清理。

2. **PowerShell 的 gzip**：没有 `gzip` 命令，需要用 .NET 的 `System.IO.Compression.GZipStream`：
   ```powershell
   $ms = New-Object IO.MemoryStream
   $gz = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionLevel]::Optimal)
   $gz.Write($bytes, 0, $bytes.Length)
   $gz.Close()
   ```

3. **Write-Host vs Write-Output**：`Write-Host` 输出到信息流（stream 6），不是 stdout，导致测试脚本无法捕获输出。改用 `Write-Output` 才能被管道读取。

4. **Start-Process 在无头 CI 环境**：CI 里没有浏览器，`Start-Process` 会报错。加 `-ErrorAction SilentlyContinue` 静默处理。

### 5.3 测试策略

为 Shell 脚本也写了测试：
- `tests/test-present.sh`：测试 URL 生成、文件输入、Tab 名、Hero 模式
- `tests/test-present.ps1`：Windows 环境下的对应测试
- CI 矩阵策略：`ubuntu-latest` + `windows-latest` 并行跑

**心得**：Shell 脚本也值得写测试，特别是涉及跨平台时。CI 矩阵是保证跨平台兼容的最好方式。

## 六、Agent Skill 设计篇

### 6.1 Skill 的定位

present-json 的 slogan 是 **"Built for agents, designed for humans"**：
- Agent 调用脚本生成 URL → 打开浏览器
- 人类在浏览器里交互式浏览 JSON

### 6.2 SKILL.md 的迭代

SKILL.md 是 Agent Skill 的"说明书"，经历了多次修正：

1. **YAML frontmatter 格式**：`description` 含特殊字符需要加引号，`argument-hint` 不是有效字段要删掉
2. **指令精简**：从内联大段 Shell 代码改为"调用脚本"，让 SKILL.md 专注于 When/How
3. **scripts/ 目录规范**：按 agentskills.io 规范，可执行脚本放 `scripts/`，测试放项目级 `tests/`

### 6.3 设计心得

- Skill 的核心价值不是技术实现，而是**降低 Agent 使用门槛**：一句话描述 + 一行命令
- 脚本要做到 **zero-config**：不需要安装依赖，用系统自带工具
- 输出要可捕获：打印 URL 到 stdout，方便 Agent 后续处理

## 七、总结：几个通用经验

### 1. 先跑通，再优化
不要一开始就追求完美方案。URL 编码从 LZ-String 到 Base64 到 Gzip，每一步都是在前一版可用的基础上迭代的。

### 2. CI 是安全网
每次改动都有 CI 验证。特别是跨平台脚本，本地测过不代表 Windows 能跑。CI 矩阵帮我们抓到了 `Write-Host` vs `Write-Output` 这类隐蔽问题。

### 3. 单一职责的脚本
最终版的 `present.sh` 做且只做一件事：JSON → 压缩 → URL → 打开浏览器 → 清理临时文件。不要把脚本拆得太碎（cleanup 独立出去后又合回来了），也不要塞太多无关逻辑。

### 4. 利用平台原生能力
- 浏览器的 `DecompressionStream` 替代了 JS 的 gzip 库
- Shell 的 `gzip | base64 | tr` 管道替代了 Node.js 脚本
- 零依赖 = 零安装 = 更可靠

### 5. 文档也是产品
SKILL.md 不是给人看的文档，是给 Agent 看的"API 说明"。措辞要精确、格式要规范，否则 Agent 会误解。

---

*本文档记录于 2026-03-13，对应分支 `claude/compress-json-before-base64-fO1bu`。*
