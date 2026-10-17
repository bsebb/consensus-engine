---
title: "React Component Identifier Scope and Build Verification"
claim: "Renaming or lifting state variables in large JSX components requires auditing all downstream template interpolation sites to prevent ReferenceError and Vite build failures."
applies_to: "client/src/pages/RoomLobby.jsx, React 19 JSX components"
status: provisional
evidence_command: "npm run build"
evidence_fail_step: 908
evidence_pass_step: 923
conversation: "3525fc0e-c89f-47b5-82f5-d0c4f44a346f"
---

# React Component Identifier Scope and Build Verification

## Context
During refactoring of dynamic lobby state synchronization in `RoomLobby.jsx`, local state variables were renamed and lifted to support real-time WebSocket state reconciliation. Downstream JSX references that remained bound to legacy identifier names caused compilation and runtime crashes.

## Prevention & Rule
1. When lifting or renaming state variables in complex React components, perform an exact identifier search across all line ranges prior to finalizing the edit.
2. Run `npm run build` immediately following component edits to catch any unreferenced or shadow identifiers before pushing to origin.
