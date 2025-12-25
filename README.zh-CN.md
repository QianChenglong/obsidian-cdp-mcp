# Obsidian CDP MCP Server

[English](README.md) | [中文](README.zh-CN.md)

通过 Chrome DevTools Protocol (CDP) 连接 Obsidian，提供 MCP 工具接口。

## 特性

相比 REST API，CDP 方式提供了更强大的能力：

| 能力 | CDP | REST API |
|:---|:---:|:---:|
| 读写文件 | ✅ | ✅ |
| **实时控制台输出** | ✅ | ❌ |
| **DOM 检查/操作** | ✅ | ❌ |
| **截图** | ✅ | ❌ |
| **执行任意 JS** | ✅ | ❌ |
| 插件管理 | ✅ | ❌ |
| 命令执行 | ✅ | ✅ |

## 前置条件

**Obsidian 必须以调试模式启动**：

```bash
# macOS
open -a Obsidian --args --remote-debugging-port=9222

# 或直接运行
/Applications/Obsidian.app/Contents/MacOS/Obsidian --remote-debugging-port=9222
```

## 安装

### 使用 npx（无需安装）

可以直接使用 `npx` 运行，无需安装：

```bash
npx obsidian-cdp-mcp
```

### 全局安装

```bash
npm install -g obsidian-cdp-mcp
```

安装后可直接使用 `obsidian-cdp-mcp` 命令。

### 从源码安装

```bash
git clone https://github.com/QianChenglong/obsidian-cdp-mcp.git
cd obsidian-cdp-mcp
npm install
npm run build
npm link
```

## MCP 配置

### CodeBuddy Code

在 `~/.codebuddy/settings.json` 中添加：

```json
{
  "mcpServers": {
    "obsidian-cdp": {
      "command": "npx",
      "args": ["obsidian-cdp-mcp"],
      "env": {
        "OBSIDIAN_DEBUG_PORT": "9222"
      }
    }
  }
}
```

或者如果已全局安装：

```json
{
  "mcpServers": {
    "obsidian-cdp": {
      "command": "obsidian-cdp-mcp",
      "env": {
        "OBSIDIAN_DEBUG_PORT": "9222"
      }
    }
  }
}
```

### Claude Desktop

在 `~/Library/Application Support/Claude/claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "obsidian-cdp": {
      "command": "npx",
      "args": ["obsidian-cdp-mcp"],
      "env": {
        "OBSIDIAN_DEBUG_PORT": "9222"
      }
    }
  }
}
```

## 可用工具

### 基础操作

| 工具 | 说明 |
|:---|:---|
| `obsidian_get_vault_info` | 获取 vault 信息 |
| `obsidian_get_active_file` | 获取当前打开的文件 |
| `obsidian_read_file` | 读取文件内容 |
| `obsidian_write_file` | 写入/创建文件 |
| `obsidian_patch_file` | 部分编辑（查找替换） |
| `obsidian_search` | 按路径搜索文件（支持 `path` 参数限定范围） |
| `obsidian_search_folders` | 按名称或路径搜索文件夹 |
| `obsidian_omnisearch` | 全文搜索（需要 Omnisearch 插件） |
| `obsidian_open_file` | 打开文件 |

### 文件和文件夹管理

| 工具 | 说明 |
|:---|:---|
| `obsidian_list_folder` | 列出文件夹内容 |
| `obsidian_create_folder` | 创建新文件夹 |
| `obsidian_move_file` | 移动或重命名文件/文件夹 |
| `obsidian_delete_file` | 删除文件/文件夹 |

### 链接和引用

| 工具 | 说明 |
|:---|:---|
| `obsidian_get_backlinks` | 获取指向文件的反向链接 |
| `obsidian_get_outlinks` | 获取文件的外向链接 |
| `obsidian_resolve_link` | 解析 wiki 链接为文件路径 |

### 元数据和属性

| 工具 | 说明 |
|:---|:---|
| `obsidian_get_tags` | 获取标签（全库或单文件） |
| `obsidian_search_by_tag` | 按标签搜索文件（支持嵌套标签） |
| `obsidian_get_frontmatter` | 获取文件 frontmatter/YAML |
| `obsidian_update_frontmatter` | 更新 frontmatter 属性 |
| `obsidian_get_all_properties` | 获取库中所有属性名 |

### 编辑器操作

| 工具 | 说明 |
|:---|:---|
| `obsidian_get_selection` | 获取选中的文本 |
| `obsidian_replace_selection` | 替换选中的文本 |
| `obsidian_insert_at_cursor` | 在光标处插入文本 |
| `obsidian_get_cursor_position` | 获取光标位置 |

### 模板

| 工具 | 说明 |
|:---|:---|
| `obsidian_list_templates` | 列出可用模板 |
| `obsidian_apply_template` | 应用模板到文件 |

### 插件和命令

| 工具 | 说明 |
|:---|:---|
| `obsidian_list_plugins` | 列出所有插件 |
| `obsidian_search_community_plugins` | 搜索社区插件库 |
| `obsidian_install_plugin` | 从社区库安装插件 |
| `obsidian_enable_plugin` | 启用已安装的插件 |
| `obsidian_disable_plugin` | 禁用已安装的插件 |
| `obsidian_uninstall_plugin` | 卸载插件 |
| `obsidian_get_plugin_settings` | 获取插件配置 |
| `obsidian_set_plugin_settings` | 更新插件配置 |
| `obsidian_list_commands` | 列出所有命令 |
| `obsidian_execute_command` | 执行命令 |
| `obsidian_dataview_query` | 运行 Dataview 查询（需要 Dataview 插件） |

### 调试能力 (CDP 独有)

| 工具 | 说明 |
|:---|:---|
| `obsidian_screenshot` | 截取 Obsidian 界面（支持 webp/png/jpeg） |
| `obsidian_console` | 获取控制台输出 |
| `obsidian_eval` | 执行任意 JavaScript |
| `obsidian_dom_query` | 查询 DOM 元素 |

## 使用示例

### 截图

```json
{
  "name": "obsidian_screenshot",
  "arguments": { "format": "webp", "quality": 80 }
}
```

### 获取控制台日志

```json
{
  "name": "obsidian_console",
  "arguments": { "limit": 20, "type": "error" }
}
```

### 执行 JavaScript

```json
{
  "name": "obsidian_eval",
  "arguments": {
    "code": "app.workspace.getActiveFile()?.path"
  }
}
```

### 搜索文件

```json
{
  "name": "obsidian_search",
  "arguments": { "query": "mcp", "limit": 10 }
}
```

### 在指定目录下搜索文件

```json
{
  "name": "obsidian_search",
  "arguments": { "query": "config", "path": "技术/kubernetes", "limit": 10 }
}
```

### 搜索文件夹

```json
{
  "name": "obsidian_search_folders",
  "arguments": { "query": "work", "limit": 10 }
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|:---|:---|:---|
| `OBSIDIAN_DEBUG_PORT` | `9222` | Obsidian 调试端口 |

## 故障排除

### Obsidian not found

确保 Obsidian 以调试模式运行：

```bash
curl http://localhost:9222/json
```

应该返回包含 Obsidian 页面信息的 JSON。

### Connection refused

检查端口是否正确，或 Obsidian 是否被防火墙阻止。

## License

MIT
