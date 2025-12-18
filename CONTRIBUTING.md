# Contributing to Obsidian CDP MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- Obsidian with debug mode enabled

### Development Setup

```bash
# Clone the repository
git clone https://github.com/QianChenglong/obsidian-cdp-mcp.git
cd obsidian-cdp-mcp

# Install dependencies
npm install

# Build the project
npm run build

# For development with auto-rebuild
npm run dev
```

### Start Obsidian in Debug Mode

```bash
# macOS
open -a Obsidian --args --remote-debugging-port=9222
```

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect relevant information (Obsidian version, OS, error messages)

When creating a bug report, include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, Obsidian version)

### Suggesting Features

Feature requests are welcome! Please:
1. Check if the feature has already been requested
2. Provide a clear use case
3. Explain why this feature would be useful

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure your code builds (`npm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

#### PR Guidelines

- Keep changes focused and atomic
- Update documentation if needed
- Add tests for new functionality when applicable
- Follow existing code style

## Code Style

- Use TypeScript
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add comments for complex logic

## Project Structure

```
obsidian-cdp-mcp/
├── src/
│   ├── index.ts      # MCP server entry point
│   ├── cdp-client.ts # Chrome DevTools Protocol client
│   └── tools.ts      # Tool definitions and handlers
├── dist/             # Compiled output
├── package.json
└── tsconfig.json
```

## Adding New Tools

To add a new MCP tool:

1. Define the tool schema in `src/tools.ts`:
```typescript
{
  name: "obsidian_new_tool",
  description: "Description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      // Define parameters
    }
  }
}
```

2. Add the handler in `ToolHandler.handle()`:
```typescript
case "obsidian_new_tool":
  return this.handleNewTool(args);
```

3. Implement the handler method:
```typescript
private async handleNewTool(args: Record<string, unknown>) {
  // Implementation
}
```

## Questions?

Feel free to open an issue for any questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
