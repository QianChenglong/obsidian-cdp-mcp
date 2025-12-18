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
| `obsidian_search` | Search files |
| `obsidian_open_file` | Open file |

### Debug Capabilities (CDP Exclusive)

| Tool | Description |
|:---|:---|
| `obsidian_screenshot` | Capture Obsidian interface |
| `obsidian_console` | Get console output |
| `obsidian_eval` | Execute arbitrary JavaScript |
| `obsidian_dom_query` | Query DOM elements |

### Plugins and Commands

| Tool | Description |
|:---|:---|
| `obsidian_list_plugins` | List all plugins |
| `obsidian_list_commands` | List all commands |
| `obsidian_execute_command` | Execute command |

## Usage Examples

### Screenshot

```json
{
  "name": "obsidian_screenshot",
  "arguments": { "format": "png" }
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
