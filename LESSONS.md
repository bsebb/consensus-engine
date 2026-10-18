# Project Operational Lessons (Argon Memory)

Keep this file under 25 lines. Record only verified, project-specific root causes and invariants.

## Verified Project Invariants
- **[Spatial & Custom Poll]**: Use word-boundary regexes (/\b(tea)\b/i) instead of substring .includes('tea') so 'Munteanu' and 'Chateau' never match cafes; fill town hospitality within 3.2km before outer rings; never render fake venue photos, ratings, prices, or road distances on Custom Poll options.
