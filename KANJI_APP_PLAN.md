# Japanese Kanji Learning App - High-Level Plan

## 1. Product Vision
Build a kanji learning app that teaches users from easiest to most complex kanji, with:
- Both **On-yomi** and **Kun-yomi** pronunciations for each kanji.
- Radical breakdown for composed kanji.
- A progression system that adapts difficulty and reinforces retention.

## 2. Objectives and Success Criteria
- Enable learners to build kanji recognition, reading, and recall in a structured path.
- Provide reliable pronunciation and decomposition data for every taught kanji.
- Keep learning sessions short, focused, and measurable.

Success metrics (initial):
- Weekly active learners (engagement).
- Lesson completion rate (usability).
- Recall accuracy after 1, 7, and 30 days (learning outcomes).

## 3. Scope
### In Scope (Phase 1) — Simplified
- Ordered kanji path (easy → complex).
- Kanji detail:
  - Meaning(s)
  - On-yomi and Kun-yomi
  - Radical decomposition (when applicable)
  - Example vocab with reading
- Lessons + reviews (SRS).
- User progress tracking.

### Out of Scope (Phase 1)
- Handwriting recognition.
- Speech recognition.
- Full grammar curriculum.
- Social/community features.

## 4. Difficulty Progression Strategy
Define “easiest to most complex” using a weighted score combining:
- Grade/JLPT frequency level.
- Usage frequency in modern Japanese corpora.
- Stroke count.
- Radical/component complexity.
- Learner performance data (error rate, response time).

Approach:
- Start with static baseline ordering from trusted datasets.
- Add adaptive personalization later based on learner performance.

## 5. Content and Data Strategy
Core entities:
- Kanji
- Reading (On/Kun)
- Radical
- Example word
- User progress record
- Review schedule item

Content requirements per kanji:
- Unicode character, meanings, stroke count, level tags.
- One or more On-yomi and Kun-yomi entries.
- Radical decomposition tree (for composed kanji).
- Example vocabulary with furigana/reading.

Anki content integration (investigated options):
- Import `.apkg` packaged decks to seed vocab/examples, ignoring scheduling data.
- Defer AnkiConnect to a later phase (adds local dependency and requires users to run Anki).

Data quality rules:
- Every kanji must include at least one reading where applicable.
- Reading type must be explicitly tagged (On vs Kun).
- Radicals/components must support nested decomposition.

## 6. Learning Experience Design
Core loops:
1. Learn: introduce new kanji with pronunciation and radicals.
2. Practice: recognition + reading quizzes.
3. Review: spaced repetition of weak items.

Session structure (target):
- 5-15 new kanji/day (configurable).
- Mixed review queue prioritized by forgetting risk.
- Immediate feedback with mnemonic/radical hints.

WaniKani-inspired mechanics to adopt:
- Level structure with unlock gating: radicals → kanji → vocabulary.
- SRS stage labels and cadence inspired by WaniKani, but adjustable per user and tunable by us.
- Typed recall prompts for meaning and reading, with immediate feedback.

Gate choice for Phase 1:
- Semi-strict: keep the radicals → kanji → vocab order, but allow a small parallel buffer so learners are not blocked (e.g., limited new items per day even if a prior gate is mid-progress).

## 7. Architecture (High Level)
- Client app (web/mobile): lessons, quizzes, progress UI.
- Backend API: content delivery, user state, scheduling.
- Content service/pipeline: ingests and validates kanji/reading/radical data.
- Analytics pipeline: tracks learning effectiveness and drop-off points.

## 8. Personalization and Spaced Repetition
- Use an SRS model (e.g., SM-2-like initially).
- Maintain per-user memory state per kanji.
- Schedule next review based on recall quality.
- Adjust item difficulty dynamically (later phase).

## 9. Quality, Testing, and Reliability
- Content validation tests:
  - Missing readings
  - Invalid reading type tagging
  - Broken radical references
- Product tests:
  - Lesson completion flow
  - Correct progression ordering behavior
  - Review scheduling correctness
- Observability:
  - Event logging for lesson and quiz outcomes
  - Dashboards for retention metrics

## 10. Delivery Plan (No Implementation Yet)
### Milestone A - Product and Data Foundations
- Finalize learning model and progression formula.
- Finalize content schema for kanji/readings/radicals.
- Define MVP UX flows and wireframes.

### Milestone B - MVP Build
- Implement core catalog + kanji detail + lesson + review loop.
- Implement user progress tracking and baseline SRS.
- Load and validate initial kanji dataset.

### Milestone C - Beta and Iteration
- Run pilot with target learners.
- Tune progression and SRS parameters.
- Improve content quality and edge cases.

## 11. Key Risks and Mitigations
- Risk: Inconsistent kanji decomposition across sources.
  - Mitigation: normalize to one canonical source and track provenance.
- Risk: Too difficult early path reduces retention.
  - Mitigation: conservative early ordering + dynamic difficulty adjustments.
- Risk: Data gaps in readings or examples.
  - Mitigation: strict validation gates before release.

## 12. Decisions to Confirm Together
1. Target platform first: web, iOS, Android, or cross-platform?
2. Target learner level first: complete beginner vs JLPT-focused?
3. Primary ordering baseline: JLPT, Japanese grade levels, or frequency-first?
4. Initial content size: 200, 500, or 1,000 kanji for MVP?
5. Should we require both standalone readings and vocabulary-context readings in MVP?

## 13. Proposed Next Iteration
After your feedback, we will refine this plan into:
- Product Requirements (MVP spec)
- Data model and API contract draft
- Milestone-level execution backlog
