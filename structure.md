# Project Structure

## Current Layout

```
.kiro/              # Kiro AI assistant configuration
  specs/            # Feature specs (requirements, design, tasks)
  steering/         # Steering rules for AI guidance
.vscode/            # VS Code workspace settings
src/
  types/
    index.ts        # All shared TypeScript interfaces and types
dist/               # Compiled output (generated, gitignored)
package.json
tsconfig.json
```

## Conventions

- Source files live under `src/`
- Tests co-located with source using `.test.ts` suffix
- All shared types exported from `src/types/index.ts`
- Module paths use ESNext with `bundler` resolution
