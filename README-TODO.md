# TODO: GitHub Package Installation Fix

This document outlines the steps needed to fully resolve the `@sdl/doc-gen` import issues when installing from GitHub.

## Current Status ✅

The branch `fix/add-dist-build-workflow` has been created with the core implementation:

- [x] GitHub Actions workflow (`.github/workflows/build-dist.yml`)
- [x] Built dist files (`dist/main.js`, `dist/main.d.ts`, `dist/main.js.map`)
- [x] Updated package.json with npm metadata
- [x] .gitignore file

## Immediate Actions Required 🚨

### 1. Push and Merge Branch
```bash
git push origin fix/add-dist-build-workflow
# Create PR and merge to main
```

### 2. Verify Repository Settings
Ensure the `intersect-sdl/sdl-doc-gen` repository has:
- [ ] GitHub Actions enabled
- [ ] Actions have write permissions to repository
- [ ] Branch protection rules allow GitHub Actions to push to main

## Potential Follow-up Changes 🔧

### 1. Enhanced GitHub Actions Permissions
If the workflow fails due to permissions, add to `.github/workflows/build-dist.yml`:

```yaml
permissions:
  contents: write  # Needed to push commits back to the repo
```

### 2. Package Script Enhancement
Add to `package.json` scripts section:

```json
"scripts": {
  "build": "rollup -c",
  "prepublishOnly": "npm run build",
  "test": "vitest --disable-console-intercept --silent=false"
}
```

### 3. Address `@sdl/bpmn` Dependency ⚠️

**Current Issue:** Package depends on `"@sdl/bpmn": "github:intersect-sdl/sdl-bpmn#main"` which has the same GitHub installation problem.

**Options:**
- [ ] **Option A:** Apply the same fix to `intersect-sdl/sdl-bpmn` repository
- [ ] **Option B:** Publish `@sdl/bpmn` to npm first
- [ ] **Option C:** Make `@sdl/bpmn` an optional dependency if not critical
- [ ] **Option D:** Bundle `@sdl/bpmn` code directly into `@sdl/doc-gen`

**Recommended:** Start with Option A (apply same fix to sdl-bpmn repo).

## Testing Checklist 🧪

After merging the branch:

- [ ] Delete local `node_modules` and `pnpm-lock.yaml`
- [ ] Run `pnpm install` fresh
- [ ] Run `pnpm build` to verify it works
- [ ] Check that GitHub Action runs successfully on next commit to main
- [ ] Verify `dist/` files are automatically updated when source changes

## Success Criteria 🎯

✅ **Complete when:**
- Main project builds successfully with `pnpm build`
- `@sdl/doc-gen` imports work without manual intervention
- GitHub Actions automatically maintain dist files
- All dependencies resolve properly

## Notes 📝

- The `[skip ci]` tag in commit messages prevents infinite workflow loops
- Dist files are intentionally tracked in git (not in .gitignore)
- Workflow only runs on source file changes, not dist file changes
- Consider version bumping strategy for future updates

---

**Created:** 2025-09-19
**Status:** In Progress
**Priority:** High - Blocks main project builds