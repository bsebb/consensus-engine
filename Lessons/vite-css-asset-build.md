---
title: "Vite Client Build and Asset Pipeline Verification"
claim: "Resolving merge conflicts and CSS custom property references across modular React components requires building the production client bundle to ensure zero unreferenced CSS tokens or unresolved import paths."
applies_to: "client/src/index.css, client/src/pages/, Vite 8 asset pipeline"
status: provisional
evidence_command: "npm run build"
evidence_fail_step: 2956
evidence_pass_step: 2980
conversation: "3525fc0e-c89f-47b5-82f5-d0c4f44a346f"
---

# Vite Client Build and Asset Pipeline Verification

## Context
During frontend style consolidation and Design Craft integration across pages and shared UI components, conflicting class declarations and stale asset references can cause production build failures even when development mode HMR tolerates loose syntax.

## Prevention & Rule
1. Always validate complete build integrity using `npm run build` after restructuring shared CSS variables or component index exports.
2. Ensure all external assets and icons are bundled through standard ESM imports rather than dynamic unverified string interpolations.
