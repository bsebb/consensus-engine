---
title: "PWA Standalone Configuration and Rollup Build Verification"
claim: "Configuring Progressive Web App standalone manifests and icons in Vite requires matching manifest asset paths and plugin hooks to ensure production Rollup bundling does not encounter unresolved static references."
applies_to: "client/vite.config.js, client/public/manifest.webmanifest, Vite PWA plugin"
status: provisional
evidence_command: "npm run build"
evidence_fail_step: 3189
evidence_pass_step: 3198
conversation: "3525fc0e-c89f-47b5-82f5-d0c4f44a346f"
---

# PWA Standalone Configuration and Rollup Build Verification

## Context
When enabling standalone Progressive Web App capabilities, discrepancies between manifest configuration files, icon filenames, and Rollup chunk transforms can trigger build failures during bundle generation.

## Prevention & Rule
1. Verify that all icon assets declared in the Web App Manifest physically exist in `public/` prior to triggering production builds.
2. Run `npm run build` to ensure the PWA service worker generation hooks integrate cleanly with the final distribution bundle.
