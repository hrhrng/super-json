# present-json Skill 优化心得

> 从一个需要 `node_modules` 的内联脚本，到一个零依赖、跨平台、自动清理的 Agent Skill 的完整演进记录。

---

## 一、Skill 演进全景

```
v1  json-share.md    — 内联 Node.js 脚本，依赖 lz-string，只输出 URL
v2  present-json     — 改名，加 base64url 编码，Shell 可用
v3  gzip 压缩        — URL 长度缩短 50-70%
v4  临时 HTML 跳转    — 自动打开浏览器，不用手动复制 URL
v5  跨平台           — 加 Windows PowerShell 支持
v6  临时文件清理      — 拆出独立 cleanup 脚本
v7  脚本合并          — cleanup 合回主脚本，单文件完成所有事
v8  修复 CI          — Write-Output 替代 Write-Host，无头环境兼容
```

12 个 commit，经历了 **4 次 PR**，最终沉淀为两个脚本文件 + 一个 SKILL.md。

## 二、最大的弯路：依赖 node_modules

### v1：内联 Node.js 脚本

第一版 Skill 的核心是这样的：

```bash
cd /home/user/super-json && node -e "
const LZString = require('lz-string');
const compressed = LZString.compressToEncodedURIComponent(process.argv[1]);
console.log('https://hrhrng.github.io/super-json?s=' + compressed);
" -- '{"key":"value"}'
```

**问题**：
1. **必须在项目根目录执行** — `require('lz-string')` 依赖 `node_modules`，换个目录就报错
2. **必须安装过依赖** — Agent 要先 `npm install`，多了一步
3. **LZ-String 的编码格式不标准** — `compressToEncodedURIComponent` 是私有格式，没有通用工具能生成

这是典型的"用熟悉的工具解决问题"的惯性思维 — 项目已经用了 LZ-String，就直接在 Skill 里也用它。但 Skill 的使用场景和 Web 应用完全不同：**Skill 在 Shell 环境运行，应该用 Shell 原生工具**。

### 转折：用 gzip 替代 LZ-String

```bash
echo -n "$JSON" | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n'
```

一行 Shell 管道，零依赖，macOS/Linux 通用。浏览器端用原生 `DecompressionStream` 解码，也不需要额外库。

**教训**：Skill 的运行环境不是你的项目环境。别把项目依赖带进 Skill 里。

## 三、URL 编码方案的三次迭代

| 版本 | URL 参数 | 编码方式 | Shell 可用 | 压缩率 |
|------|----------|----------|-----------|--------|
| v1 | `?s=` | LZ-String | 否（需要 Node.js + npm） | 好 |
| v2 | `?r=` | 原始 Base64url | 是 | 无（反而膨胀 33%） |
| v3 | `?c=` | Gzip + Base64url | 是 | 比 `?r=` 缩短 50-70% |

### 为什么需要三个参数共存？

Web 应用的 Share 按钮仍然用 `?s=`（LZ-String），因为浏览器端 LZ-String 已经是依赖了，没必要改。`?r=` 作为无压缩降级方案保留。`?c=` 是 Skill 专用的推荐方案。

三者在前端统一由 `useSimpleImport.ts` 路由：

```typescript
if (params.get('c'))  → importFromCompressedUrl()   // gzip
if (params.get('s'))  → importFromUrl()              // lz-string
if (params.get('r'))  → importFromBase64Url()        // raw base64
```

**心得**：向后兼容不等于一直用老方案。新场景可以引入新编码，只要解码端都支持就行。

## 四、从"输出 URL"到"打开浏览器"

### v1：只打印 URL

```
Agent: 这是您的 JSON 查看链接: https://hrhrng.github.io/super-json?c=H4sI...
用户: (复制) → (粘贴到浏览器) → (终于看到了)
```

三步操作，体验差。

### v2：临时 HTML 跳转

```bash
# 生成一个带 meta refresh 的临时 HTML
printf '<html><head><meta http-equiv="refresh" content="0;url=%s"></head></html>' "$URL" > /tmp/super-json-xxx.html

# 用系统默认浏览器打开
open /tmp/super-json-xxx.html  # macOS
xdg-open /tmp/super-json-xxx.html  # Linux
```

为什么不直接 `open "$URL"`？因为 URL 可能非常长（含整个 JSON 数据），某些系统的 `open` 命令对参数长度有限制。写成文件再打开，绕过了这个限制。

**心得**：Skill 的终极目标是**减少用户操作步骤**。能自动打开就不要让用户手动复制。

## 五、跨平台：Shell 与 PowerShell 的鸿沟

### 5.1 Gzip 压缩

**Bash**：一行管道
```bash
echo -n "$JSON" | gzip -9 | base64 | tr '+/' '-_' | tr -d '=\n'
```

**PowerShell**：需要调用 .NET API
```powershell
$ms = New-Object System.IO.MemoryStream
$gz = New-Object System.IO.Compression.GZipStream(
    $ms, [System.IO.Compression.CompressionLevel]::Optimal)
$gz.Write($bytes, 0, $bytes.Length)
$gz.Close()
$encoded = [Convert]::ToBase64String($ms.ToArray()).Replace('+','-').Replace('/','_').TrimEnd('=')
```

同一个功能，代码量差 5 倍。但好处是 PowerShell 内置 .NET，也是零依赖。

### 5.2 Write-Host 大坑

这是被 CI 抓到的 bug，本地不可能发现：

```powershell
Write-Host $url    # ← 输出到信息流 (stream 6)，不进 stdout
Write-Output $url  # ← 输出到 stdout，可被管道捕获
```

测试脚本用 `$output = & ./present.ps1 ...` 捕获输出，`Write-Host` 的结果拿不到，测试直接挂。

**教训**：PowerShell 的 `Write-Host` 类似 `console.log` 而不是 `echo`。要让输出可被程序捕获，必须用 `Write-Output`。

### 5.3 临时文件清理的平台差异

| | Linux | Windows |
|--|-------|---------|
| 临时目录 | `/tmp`（重启清空） | `$env:TEMP`（永久保留） |
| 后台延迟删除 | `(sleep 5 && rm -f ...) &` | `Start-Job { Start-Sleep 5; Remove-Item ... }` |
| 浏览器打开 | `xdg-open` / `open` | `Start-Process` |

Windows 的 `$env:TEMP` 不会自动清理是个隐患。所以脚本每次运行时不只删自己的临时文件，还会清理所有 `super-json-*.html` —— 包括上次可能残留的。

### 5.4 CI 无头环境

CI 里没有浏览器，`Start-Process` 和 `xdg-open` 都会报错。处理方式不同：

- **Bash**：`open "$f" 2>/dev/null || xdg-open "$f" 2>/dev/null || echo "$URL"` — 降级到打印 URL
- **PowerShell**：`Start-Process $f -ErrorAction SilentlyContinue` — 静默忽略

## 六、脚本架构的反复：拆了又合

### 第一阶段：单一 SKILL.md 内联代码

所有逻辑写在 SKILL.md 里，让 Agent 复制粘贴执行。问题：SKILL.md 又长又乱，Agent 容易出错。

### 第二阶段：拆分为多个脚本

```
skills/present-json/
├── SKILL.md
└── scripts/
    ├── present.sh        # 压缩 + 生成 URL
    ├── present.ps1
    ├── cleanup-temp.sh   # 清理临时文件
    ├── cleanup-temp.ps1
    ├── test-cleanup.sh   # 测试清理逻辑
    └── test-cleanup.ps1
```

问题：过度拆分。cleanup 逻辑只有两三行，独立成文件后反而增加了理解成本。测试文件混在 `scripts/` 里也不符合 Agent Skills 规范（`scripts/` 应该只放可执行代码）。

### 第三阶段：合并 + 归位

```
skills/present-json/
├── SKILL.md              # 简洁的使用说明
└── scripts/
    ├── present.sh        # 压缩 + URL + 打开浏览器 + 清理（all-in-one）
    └── present.ps1

tests/
├── test-present.sh       # 测试挪到项目级 tests/
└── test-present.ps1
```

**教训**：不要为了"分离关注点"而拆分只有三行的逻辑。先合在一起，等真的复杂到需要拆分时再拆。cleanup 逻辑（`sleep 5 && rm -f /tmp/super-json-*.html`）就一行，独立成文件完全没必要。

## 七、SKILL.md 的写作迭代

SKILL.md 不是给人看的文档，是给 **Agent 看的 API 说明**。措辞精度直接影响 Agent 的执行质量。

### 踩过的格式坑

1. **YAML frontmatter 引号**：`description` 含冒号/特殊字符必须加引号，否则 YAML 解析失败
2. **无效字段**：`argument-hint` 不是标准字段，Agent Skills 验证会报错
3. **路径问题**：Skill 安装后通过 symlink 引用，脚本路径要用相对路径 `scripts/present.sh`

### 从"教 Agent 写代码"到"让 Agent 调脚本"

**v1 SKILL.md** 的做法是把整段 Shell 代码写在 Markdown 里，让 Agent 复制执行。问题：
- Agent 可能复制错
- 代码更新后 SKILL.md 要同步改
- 内联代码让文档变得冗长

**最终版** 的做法是只告诉 Agent "运行 `bash scripts/present.sh`"，细节全封装在脚本里。SKILL.md 专注于 **when（什么时候用）** 和 **how（怎么调用）**。

## 八、测试：Shell 脚本也值得测

为两个 present 脚本写了完整测试：

| 测试项 | 验证内容 |
|--------|---------|
| inline JSON | 输出 URL 包含 `?c=` |
| 文件输入 | 从 .json 文件读取并压缩 |
| --hero 参数 | URL 包含 `&h=1` |
| Tab 名编码 | 空格被编码为 `%20` |
| 临时文件清理 | 等待 7 秒后文件被删除 |
| 缺少参数 | 退出码非零 |

CI 矩阵：`ubuntu-latest` × `windows-latest` 并行跑。

**有用的 trick**：测试时用 stub 替代 `open`/`xdg-open`，避免在 CI 里真的打开浏览器：

```bash
mkdir -p tests/stubs
printf '#!/bin/sh\nexit 0\n' > tests/stubs/open
chmod +x tests/stubs/open
export PATH="tests/stubs:$PATH"
```

## 九、总结

### 核心数字

| 指标 | v1 (json-share) | 最终版 (present-json) |
|------|-----------------|----------------------|
| 依赖 | node_modules (lz-string) | 零依赖 |
| 平台 | 仅有 Node.js 的环境 | macOS / Linux / Windows |
| 用户操作 | 复制 URL → 粘贴到浏览器 | 自动打开浏览器 |
| URL 长度 | 基准 (LZ-String) | 缩短 50-70% (Gzip) |
| 脚本文件 | 0（内联在 SKILL.md） | 2 (`present.sh` + `present.ps1`) |
| 测试 | 无 | 6 个测试用例 × 2 平台 |
| CI | 无 | ubuntu + windows 矩阵 |

### 关键心得

1. **Skill 的运行环境 ≠ 项目环境** — 别把 `node_modules` 带进 Shell 脚本
2. **先合后拆** — 不要预判性地拆分只有几行的逻辑，等真的复杂了再说
3. **SKILL.md 是给 Agent 看的 API 文档** — 精确、规范、只讲 when 和 how
4. **用平台原生能力** — `gzip` / `GZipStream` / `DecompressionStream` 都是自带的，零安装
5. **CI 矩阵是跨平台的安全网** — `Write-Host` vs `Write-Output` 这种坑只有跑 Windows CI 才能发现
6. **减少用户操作步骤** — 能自动打开浏览器就不要让用户复制 URL

---

*记录于 2026-03-13，对应分支 `claude/compress-json-before-base64-fO1bu`，共 12 次 commit，4 次 PR。*
