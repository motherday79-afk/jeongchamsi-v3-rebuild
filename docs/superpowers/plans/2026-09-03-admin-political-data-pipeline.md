# JCS Admin Political Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the administrator-operated, resumable collection and atomic publishing pipeline that preserves 543 slots, fills the 542 non-vacant politician intelligence records, and produces the live NOW TOP 30.

**Architecture:** A Redis-backed job repository stores one draft and one published record per politician. The browser repeatedly calls one bounded batch step after a single administrator click; every server call processes at most 25 politicians, persists its cursor, and is safe to resume. Publishing writes a complete immutable snapshot and switches one public pointer only after validation.

**Tech Stack:** Vercel Node.js Function, browser ES modules, Redis command adapter, Node `crypto`, Node test runner

**Spec:** `docs/superpowers/specs/2026-09-03-admin-political-data-pipeline.md`

## Global Constraints

- Never issue a single `MGET` for all 542 non-vacant politicians.
- Every politician batch is 25 records or fewer.
- Use only Naver Search Ads, Google/web news, Gallup/NEC, and official election/population/age-by-gender material.
- Do not add another authenticated or paid API.
- Do not use an unrelated fallback source.
- Store raw facts separately from deterministic JCS interpretations.
- Never expose Naver credentials to browser code, API responses, logs, or packaged files.
- Never alter or delete the previous public snapshot during collection or partial publishing.
- Do not change these constraints without the operator's explicit approval.

---

### Task 1: Redis batch-safety and job repository

**Files:**
- Create: `lib/intelligence-keys.js`
- Create: `lib/intelligence-repository.js`
- Test: `tests/intelligence-repository.test.js`

**Interfaces:**
- Produces: `MAX_POLITICIAN_BATCH = 25`, `chunkKeys(keys, size)`, `batchedMget(command, keys, size)`, `createIntelligenceRepository(command)`
- Repository methods: `createJob(kind, snapshotId, personIds)`, `readJob(kind)`, `claimNextBatch(kind)`, `completeBatch(kind, result)`, `putDraft(snapshotId, personId, value)`, `getDrafts(snapshotId, personIds)`, `putPublished(snapshotId, personId, value)`, `getPublished(snapshotId, personId)`, `setPublicPointer(snapshotId)`, `getPublicPointer()`

- [ ] Write tests proving 26-key batch requests are rejected, 542/543-key safety probes are split into 22 calls of at most 25 keys, job cursors resume after a new repository instance, and one failed person does not erase successful progress.
- [ ] Run `node --test tests/intelligence-repository.test.js` and verify the tests fail because the modules do not exist.
- [ ] Implement key names, JSON parsing, bounded `MGET`, job state, and immutable per-person draft/published records.
- [ ] Run the repository tests and the existing suite; verify all pass.

### Task 2: Naver Search Ads and Google News collectors

**Files:**
- Create: `lib/naver-search-ads.js`
- Create: `lib/google-news.js`
- Create: `lib/intelligence-collectors.js`
- Modify: `.env.example`
- Test: `tests/intelligence-collectors.test.js`

**Interfaces:**
- Produces: `naverCredentialStatus(env)`, `createNaverSignature({timestamp, method, uri, secret})`, `fetchNaverKeywordVolume(person, options)`, `fetchGoogleNews(person, options)`, `collectPoliticianRaw(person, context, options)`
- `collectPoliticianRaw` returns `{personId, collectedAt, sources, searchAds, news, officialProfile, sourceErrors}` without secrets.

- [ ] Write literal-fixture tests for HMAC Base64 signature output, credential status redaction, PC/mobile volume normalization, Google RSS parsing, source-error isolation, and the absence of Naver secrets in serialized results.
- [ ] Run the collector test and verify the missing modules fail.
- [ ] Implement the Naver `/keywordstool` GET request and Google News RSS parser with timeout, retry classification, and source provenance.
- [ ] Add only the three established Naver key names to `.env.example` with empty values.
- [ ] Run collector and full tests.

### Task 3: Deterministic JCS analysis and validation

**Files:**
- Create: `lib/intelligence-analysis.js`
- Create: `lib/intelligence-validation.js`
- Test: `tests/intelligence-analysis.test.js`

**Interfaces:**
- Produces: `buildIntelligenceDraft(person, raw, sharedContext, algorithmVersion)`, `validateIntelligenceDraft(draft)`, `validateSnapshot(drafts, expectedIds)`
- Drafts expose the same public and administrator chapter fields currently rendered by `src/data/kim-minseok-pilot.js`, plus `raw`, `sources`, `algorithmVersion`, and `snapshot`.

- [ ] Write tests proving the same inputs return the same draft, different age/sex feature inputs produce distinct cohort cells, cloned cohort vectors fail validation, required chapters are all populated, and no random or external source field appears.
- [ ] Run tests and verify missing implementation failures.
- [ ] Implement versioned formulas for NOW, core, audience, activity/media, cohorts, support, resilience, issues, risks/opportunities, competitors, strategies, and source ledger.
- [ ] Keep raw search/election/news numbers unchanged and label all derived values as JCS interpretation.
- [ ] Run analysis and full tests.

### Task 4: Resumable collection and atomic publishing services

**Files:**
- Create: `lib/intelligence-service.js`
- Modify: `lib/politician-store.js`
- Test: `tests/intelligence-service.test.js`

**Interfaces:**
- Produces: `createIntelligenceService({command, fetchImpl, now, env})`
- Service methods: `status()`, `startCollection()`, `runCollectionStep()`, `preview()`, `startPublish()`, `runPublishStep()`, `getPublicIntelligence(personId)`, `getPublicRankings()`

- [ ] Write tests for a 542-person job's 22 bounded steps, resume after interruption, per-person retry/error continuation, publish precondition, partial-publish pointer preservation, final pointer switch, and TOP 30 ordering.
- [ ] Run service tests and verify they fail.
- [ ] Implement collection over the 542 non-vacant people while preserving all 543 profile slots, draft persistence, snapshot validation, bounded publication, and ranking indexes.
- [ ] Update politician reads so detail responses include the current published intelligence and list responses may use live rank metadata without changing profile/photo data.
- [ ] Run service and full tests.

### Task 5: Administrator API and one-click runner

**Files:**
- Modify: `api/gateway.js`
- Modify: `src/core/auth.js`
- Modify: `src/views/stage1.js`
- Modify: `src/app.js`
- Modify: `css/pages.css`
- Test: `tests/admin-intelligence.test.js`

**Interfaces:**
- API routes match the approved spec under `/api/v3/admin/intelligence/*`.
- Client methods: `intelligenceStatus()`, `startIntelligenceCollection()`, `runIntelligenceCollectionStep(jobId)`, `intelligencePreview()`, `startIntelligencePublish()`, `runIntelligencePublishStep(jobId)`.

- [ ] Write tests proving anonymous/member access is denied, admin responses redact credentials, the admin page has exactly one collection and one publish control, progress/ETA/error counts render, and no browser source contains a Naver secret.
- [ ] Run tests and verify the new behavior fails.
- [ ] Add administrator routes and server-side authorization.
- [ ] Extend the existing admin page without removing member/content summaries.
- [ ] Implement the browser batch loop: one click starts, subsequent step calls continue automatically, and a reload resumes a RUNNING job.
- [ ] Style connection, progress, validation, preview, and action states at the approved readable font floor.
- [ ] Run admin and full tests.

### Task 6: Published detail data and real NOW TOP 30

**Files:**
- Modify: `src/core/politicians.js`
- Modify: `src/views/politicians.js`
- Modify: `src/layout/home-layout.js`
- Modify: `src/app.js`
- Test: `tests/published-intelligence.test.js`

**Interfaces:**
- Politician detail API returns `item.intelligence` only from the active public snapshot.
- Rank API/list result exposes `rank`, `nowScore`, and category rank from the active snapshot.

- [ ] Write tests proving a published non-Kim politician uses the complete Kim layout with its own values, unpublished drafts never appear publicly, and home renders the actual sorted TOP 30 without automatic rotation.
- [ ] Run tests and verify the new behavior fails.
- [ ] Replace pilot-only branching with published-data rendering while retaining the Kim pilot only until the first successful publication exists.
- [ ] Feed the live TOP 30 into the existing manual 10-by-3 carousel.
- [ ] Run published-data and full tests.

### Task 7: Release verification and package

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `api/gateway.js`
- Create: `JCS_0_0_15.zip` outside the project directory

**Interfaces:**
- Health endpoint and browser cache keys identify `JCS_0_0_15`.

- [ ] Update release metadata only after all feature tests pass.
- [ ] Run `node --check` on every changed JavaScript file.
- [ ] Run `node --test tests/*.test.js` and require zero failures.
- [ ] Inspect the ZIP file list and verify it contains changed source, tests, and documentation but no `.env.local`, secrets, root-level accidental photo copies, or `node_modules`.
- [ ] Deploy only after Vercel Production has Redis and, when available, the three Naver Search Ads variables.
- [ ] Verify admin session, status, collection start/step, publish guard, public detail, NOW TOP 30, `/api/v3/user/session`, login, and existing content endpoints on the deployment.
