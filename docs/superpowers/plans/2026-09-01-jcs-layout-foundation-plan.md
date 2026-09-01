# JCS V3 Clean Layout Foundation Implementation Plan

**Goal:** Deliver a self-contained responsive layout foundation covering Home, Politician Detail, Compare and Admin.

**Architecture:** Zero-build static SPA with hash routing and reusable DOM render helpers. Styling is centralized in one tokenized CSS file. Fixture content is isolated from routing and presentation logic.

**Tech Stack:** HTML5, CSS3, vanilla ES2022 JavaScript, Node.js built-in test runner.

## Tasks
1. Create structural regression tests for shell and four page routes.
2. Implement shared visual system and responsive shell.
3. Implement Home information hierarchy.
4. Implement Politician detail layout.
5. Implement Compare layout.
6. Implement Admin control-center layout.
7. Run tests, syntax checks and package the foundation.
