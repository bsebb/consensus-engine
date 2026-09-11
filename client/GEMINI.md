# Frontend Rules (Client Scope)

These rules apply whenever viewing, editing, or creating files in `/client`.

## 1. Apple Human Interface Guidelines (HIG) Standard
*   **Design Framework:** For any UI/UX, styling, or component task, strictly enforce the `apple-design` skill standards:
    *   **Touch Targets:** Minimum 44 × 44 pt on mobile controls; generous spacing between action buttons.
    *   **Liquid Glass Material:** Floating functional navigation and action bars must use translucent backdrop blur (`backdrop-blur-xl bg-white/80 border border-white/60`). Glass is never used in the content layer.
    *   **Typography:** Use Apple SF Pro system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display"`). Muted labels must maintain at least 4.5:1 WCAG AA contrast.
    *   **Semantic Palette:** Apple System Gray canvas (`#F2F2F7`), Inset Grouped cards (`#FFFFFF`), System Blue (`#007AFF`) primary, System Green (`#34C759`) approve, System Red (`#FF3B30`) pass, System Orange (`#FF9500`) veto.
    *   **Thumb-Zone Ergonomics:** Primary interactive CTAs must be anchored in the lower third of mobile viewports.

## 2. Dynamic Production Data
*   **Zero Hardcoding:** Never hardcode student team names, fixed participant rosters, or hardcoded voter counts (e.g. `4 of 5`). All rooms, participant lists, and suggestion pools must initialize dynamically.
*   **Empty State Safety:** Ensure components render gracefully when arrays are empty, without division-by-zero or index out-of-bounds crashes.

## 3. Static Analysis & Verification Gate
*   **Fast AST Check:** After modifying any `.jsx`, `.js`, or `.tsx` file, run `npx oxlint` from `/client` to verify 0 undefined variable reference errors before declaring the task complete.
*   **Build Check:** Run `npm run build` to confirm zero syntax or bundling errors.
