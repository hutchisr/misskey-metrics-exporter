# CRUSH Configuration

## Commands
- **Start**: `deno task start` - Run the app with permissions
- **Dev**: `deno task dev` - Run with watch mode  
- **Format**: `deno fmt` - Format all files
- **Format check**: `deno fmt --check` - Check formatting
- **Type check**: `deno check src/main.ts` - Check types
- **Test**: `deno test tests/ --allow-env --allow-net` - Run all tests
- **Test single**: `deno test tests/FILENAME_test.ts --allow-env --allow-net` - Run specific test

## Code Style
- Use Deno's built-in formatter (2 spaces, trailing commas)
- TypeScript strict mode enabled in deno.jsonc
- Import from JSR standard library: `jsr:@std/log`, `jsr:@std/assert`
- Import from npm: `npm:prom-client`
- Use interface definitions in types.ts for shared types
- Prefer async/await over promises
- Use camelCase for variables, PascalCase for classes/interfaces
- Use private methods with `private` keyword
- Environment variables via `Deno.env.get()` with defaults
- Error handling with try/catch, log errors with `log.error()`
- Use performance.now() for timing metrics
- File structure: main.ts (entry), config.ts (env), types.ts (interfaces)
- Class constructors initialize dependencies via dependency injection
- Use graceful shutdown handlers for SIGINT/SIGTERM
- HTTP responses use standard status codes (200, 404, 500, 503)
- JSON responses include proper Content-Type headers
- Tests in separate `/tests` directory with `_test.ts` suffix
- Clear prometheus registry between tests with `register.clear()`

## Permissions
Required: `--allow-net --allow-env --allow-read`

## LSP Setup
- **Deno LSP**: Built-in TypeScript/JavaScript support
- **Configuration**: Uses deno.jsonc for import maps and compiler options
- **Extensions**: Deno extension for VS Code provides full LSP features
- **Commands**: `deno lsp` for manual LSP server startup