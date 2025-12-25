# Obsidian CDP MCP Server

[English](README.md) | [中文](README.zh-CN.md)

Connect to Obsidian via Chrome DevTools Protocol (CDP), providing MCP tool interfaces.

## Features

Compared to REST API, CDP provides more powerful capabilities:

| Capability | CDP | REST API |
|:---|:---:|:---:|
| Read/Write Files | ✅ | ✅ |
| **Real-time Console Output** | ✅ | ❌ |
| **DOM Inspection/Manipulation** | ✅ | ❌ |
| **Screenshots** | ✅ | ❌ |
| **Execute Arbitrary JS** | ✅ | ❌ |
| Plugin Management | ✅ | ❌ |
| Command Execution | ✅ | ✅ |

## Prerequisites

**Obsidian must be started in debug mode**:

```bash
# macOS
open -a Obsidian --args --remote-debugging-port=9222

# Or run directly
/Applications/Obsidian.app/Contents/MacOS/Obsidian --remote-debugging-port=9222
```

## Installation

### Using npx (No Installation Required)

You can use `npx` to run the server directly without installing:

```bash
npx obsidian-cdp-mcp
```

### Global Installation

```bash
npm install -g obsidian-cdp-mcp
```

After installation, you can use the `obsidian-cdp-mcp` command directly.

### From Source

```bash
git clone https://github.com/QianChenglong/obsidian-cdp-mcp.git
cd obsidian-cdp-mcp
npm install
npm run build
npm link
```

## MCP Configuration

### CodeBuddy Code

Add to `~/.codebuddy/settings.json`:

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

Or if installed globally:

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

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Available Tools

### Basic Operations

| Tool | Description |
|:---|:---|
| `obsidian_get_vault_info` | Get vault information |
| `obsidian_get_active_file` | Get currently open file |
| `obsidian_read_file` | Read file content |
| `obsidian_write_file` | Write/create file |
| `obsidian_patch_file` | Apply partial edits using search and replace |
| `obsidian_search` | Search files by path (supports `path` param to limit scope) |
| `obsidian_search_folders` | Search folders by name or path |
| `obsidian_omnisearch` | Full-text search (requires Omnisearch plugin) |
| `obsidian_open_file` | Open file |

### File & Folder Management

| Tool | Description |
|:---|:---|
| `obsidian_list_folder` | List folder contents |
| `obsidian_create_folder` | Create new folder |
| `obsidian_move_file` | Move or rename file/folder |
| `obsidian_delete_file` | Delete file/folder |

### Links & References

| Tool | Description |
|:---|:---|
| `obsidian_get_backlinks` | Get incoming links to a file |
| `obsidian_get_outlinks` | Get outgoing links from a file |
| `obsidian_resolve_link` | Resolve wiki link to file path |

### Metadata & Properties

| Tool | Description |
|:---|:---|
| `obsidian_get_tags` | Get tags (vault-wide or per file) |
| `obsidian_search_by_tag` | Search files by tag (supports nested tags) |
| `obsidian_get_frontmatter` | Get file frontmatter/YAML |
| `obsidian_update_frontmatter` | Update frontmatter properties |
| `obsidian_get_all_properties` | Get all property names in vault |

### Editor Operations

| Tool | Description |
|:---|:---|
| `obsidian_get_selection` | Get selected text |
| `obsidian_replace_selection` | Replace selected text |
| `obsidian_insert_at_cursor` | Insert text at cursor |
| `obsidian_get_cursor_position` | Get cursor position |

### Templates

| Tool | Description |
|:---|:---|
| `obsidian_list_templates` | List available templates |
| `obsidian_apply_template` | Apply template to file |

### Plugins & Commands

| Tool | Description |
|:---|:---|
| `obsidian_list_plugins` | List all plugins |
| `obsidian_search_community_plugins` | Search community plugin repository |
| `obsidian_install_plugin` | Install plugin from community repository |
| `obsidian_enable_plugin` | Enable an installed plugin |
| `obsidian_disable_plugin` | Disable an installed plugin |
| `obsidian_uninstall_plugin` | Uninstall a plugin |
| `obsidian_get_plugin_settings` | Get plugin settings |
| `obsidian_set_plugin_settings` | Update plugin settings |
| `obsidian_list_commands` | List all commands |
| `obsidian_execute_command` | Execute command |
| `obsidian_dataview_query` | Run Dataview query (requires Dataview plugin) |

### Debug Capabilities (CDP Exclusive)

| Tool | Description |
|:---|:---|
| `obsidian_screenshot` | Capture Obsidian interface (webp/png/jpeg) |
| `obsidian_console` | Get console output |
| `obsidian_eval` | Execute arbitrary JavaScript |
| `obsidian_dom_query` | Query DOM elements |

## Usage Examples

### Screenshot

```json
{
  "name": "obsidian_screenshot",
  "arguments": { "format": "webp", "quality": 80 }
}
```

### Get Console Logs

```json
{
  "name": "obsidian_console",
  "arguments": { "limit": 20, "type": "error" }
}
```

### Execute JavaScript

```json
{
  "name": "obsidian_eval",
  "arguments": {
    "code": "app.workspace.getActiveFile()?.path"
  }
}
```

### Search Files

```json
{
  "name": "obsidian_search",
  "arguments": { "query": "mcp", "limit": 10 }
}
```

### Search Files in Specific Folder

```json
{
  "name": "obsidian_search",
  "arguments": { "query": "config", "path": "技术/kubernetes", "limit": 10 }
}
```

### Search Folders

```json
{
  "name": "obsidian_search_folders",
  "arguments": { "query": "work", "limit": 10 }
}
```

## Environment Variables

| Variable | Default | Description |
|:---|:---|:---|
| `OBSIDIAN_DEBUG_PORT` | `9222` | Obsidian debug port |

## Troubleshooting

### Obsidian not found

Make sure Obsidian is running in debug mode:

```bash
curl http://localhost:9222/json
```

Should return JSON containing Obsidian page information.

### Connection refused

Check if the port is correct, or if Obsidian is blocked by firewall.

## License

MIT
