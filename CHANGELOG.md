# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-12-18

### Added

- Initial release
- CDP connection to Obsidian via Chrome DevTools Protocol
- Basic file operations:
  - `obsidian_get_vault_info` - Get vault information
  - `obsidian_get_active_file` - Get currently open file
  - `obsidian_read_file` - Read file content
  - `obsidian_write_file` - Write/create file
  - `obsidian_search` - Search files
  - `obsidian_open_file` - Open file
- Debug capabilities (CDP exclusive):
  - `obsidian_screenshot` - Capture Obsidian interface
  - `obsidian_console` - Get console output
  - `obsidian_eval` - Execute arbitrary JavaScript
  - `obsidian_dom_query` - Query DOM elements
- Plugin and command management:
  - `obsidian_list_plugins` - List all plugins
  - `obsidian_list_commands` - List all commands
  - `obsidian_execute_command` - Execute command
- MCP server implementation with stdio transport
- Automatic reconnection on connection loss
- Support for CodeBuddy Code and Claude Desktop

[Unreleased]: https://github.com/QianChenglong/obsidian-cdp-mcp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/QianChenglong/obsidian-cdp-mcp/releases/tag/v1.0.0
