# Politician article curation implementation plan

User approved development and deployment; acceptance remains with user.

## Contract
- Staff/admin and superadmin edit articles from politician detail; ordinary and platinum users cannot.
- Inline article editor uses a readable candidate list, destination/position choice, immediate exclude/place/automatic actions. No separate Save step.
- API `/api/v3/article-curation`: GET `personId`; POST `{personId,operation,articleKey,slot}`. Slots `headlines:0..9`, `brand:0`, `competitor:24H:0..2`, `competitor:7D:0..2`, `competitor:30D:0..2`, `lifecycle:0..4`, `activity:0..4`. Competition edits belong to that card's politician.
- GET returns `{ok:true,person:{id,name},candidates:[{key,title,url,source,date}],placements:{slot:key},excluded:[{key,title,url,source,date,excludedAt,excludedBy}]}`. POST returns same shape. Operations exclude/place/automatic/restore. Restore only superadmin console.
- Per-person persistent exclusions and pins survive publication. Article identity normalizes URLs and publisher/title aliases. Stored selected article snapshots preserve manual choices across rolling collection.
- Exclusions apply to all article-bearing parts of a report, including competitors, immediately on reads; fill vacant slots with other candidates. Collection skips manual exclusions even if feed returns them again. Candidate collection retains uncertain/homonymous results for staff selection, with normal public automatic preference where feasible.
- Source data and 7th media metrics retained; this is display editorial selection, not a claim all same-name metrics are fully disambiguated.

## Steps
1. Implement curation identity/storage/projection service with authority, concurrency and persistence tests.
2. Implement independent accessible inline UI and admin recovery view using contract.
3. Integrate API, report projection, collection persistence and latest candidates; keep existing permission boundaries and rank metrics.
4. Verify exclusion across duplicate placements, refresh survival, rival scope, automatic refill, manual pin, restore, source escaping and errors.
5. Release cache versions, commit explicit files, push and verify Vercel deployment.
