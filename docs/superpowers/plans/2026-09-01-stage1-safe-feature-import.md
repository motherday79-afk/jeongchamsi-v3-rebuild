# Stage 1 Safe Feature Import Implementation Plan

**Goal:** Enable the previously stable participation/content/member flows on top of the preserved JCS layout while excluding NOW/people intelligence/history/refresh code.

**Architecture:** Keep existing layout/CSS/icon assets. Route stable features through isolated client modules and a single storage adapter so the persistence backend can later be swapped without rewriting views.

**Excluded:** NOW data engine, politician intelligence, refresh, AGE/GENDER/COHORT, HISTORY, admin intelligence.
