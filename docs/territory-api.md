# Political territory API

GET and POST `/api/v3/territory`. GET is public, POST needs an active authenticated account and same-origin request. Millisecond timestamps. No monetary/game payout. All prices are existing JCS points.

Successful response: `{ok:true,serverNow,round:{id,startsAt,endsAt},territories,parties,offices,player,logs,rules,moves,officeCatalog,result?}`.

- `parties`: `{id,name,color}`[] IDs democratic, ppp, rebuilding, reform, progressive, basic, social.
- `territories`: `{id,name,ownerPartyId:null|string,scores:{[partyId]:number},challengerPartyId:null|string,holdStartedAt:null|number,protectedUntil:number}`[]. IDs `bluehouse`, `assembly`.
- `offices`: `{[partyId]:{policy:number,media:number,research:number}}`. Levels 0–5. Next upgrade price `100*(level+1)`.
- `officeCatalog`: `{id,name,description}`[] policy, media, research.
- `moves`: `{id,name,officeId,role:'challenge'|'defend',description}`[]. Challenge moves bill/media/scrutiny; defender moves amendment/rebuttal/disclosure. Challenge allowed for neutral territory or another party's territory. Defend allowed only for the owning party. Each adds `40 + officeLevel*8` influence to the acting party, with scores capped at 2000. Defend additionally removes `20 + officeLevel*4` from the leading opponent. Challenge scrutiny additionally removes `10 + officeLevel*2` from the leading opponent, including neutral territories to prevent a maximum-score tie deadlock. These are game mechanics, not political assertions.
- `player`: null for spectator, otherwise `{partyId:null|string,energy:number,nextEnergyAt:null|number,contribution:number,balance:number,cooldownUntil:number}`. New round resets party, energy 100, contribution 0, cooldown. Passive energy recovery 1 per 300000ms up to 100. No points awarded for time, joining, or ownership.
- `logs`: recent 50 `{id,at,type,partyId,territoryId?,moveId?,officeId?,level?,points?,influence?,nickname?}` newest first. No account IDs exposed.
- `rules`: `{captureThreshold:600,leaderMargin:100,holdMs:300000,protectionMs:600000,maxScore:2000,maxEnergy:100,energyRegenMs:300000,actionEnergy:10,actionPoints:20,cooldownMs:10000,maxOfficeLevel:5,upgradeBasePoints:100}`.
- Weekly round Monday 00:00 KST. Initial territories neutral. A qualifying sole leader must retain threshold and margin for five minutes. After capture, ten-minute protection blocks a new hold from starting. Action changes reset broken holds. Server settles elapsed hold before applying any later action.

POST body common fields `roundId` (current response round.id), `requestId` (12–100 ASCII alphanumeric, `_`, `-`; new per intentional operation, reuse unchanged on retry).

- `{action:'join',partyId,roundId,requestId}` free. Party locked until next round.
- `{action:'act',territoryId,moveId,roundId,requestId}` 20 points + 10 energy, cooldown 10 seconds.
- `{action:'upgrade',officeId,expectedPoints,roundId,requestId}` price above; expectedPoints must equal the displayed next-upgrade price (integer); stale quotes fail with PRICE_CHANGED before any debit; zero energy, shared party level, cooldown 10 seconds.

`result`: `{action,points,...}` receipt. Repeated identical request returns original receipt with fresh current state (`replayed:true`); changed body with same requestId returns 409. Receipts expire after 14 days; stale-round commands always fail.

Errors `{ok:false,error, retryAfterSeconds?}`: 400 INVALID_INPUT / INVALID_REQUEST_ID / INVALID_PARTY / INVALID_MOVE / INVALID_TERRITORY / INVALID_OFFICE; 401 LOGIN_REQUIRED; 403 ACCOUNT_INACTIVE / ORIGIN_INVALID / ROLE_REQUIRED; 409 ROUND_CHANGED / PARTY_LOCKED / JOIN_REQUIRED / REQUEST_ID_REUSED / OFFICE_MAX / PRICE_CHANGED / CONFLICT; 402 INSUFFICIENT_POINTS; 429 COOLDOWN / INSUFFICIENT_ENERGY; 503 STORAGE_UNAVAILABLE; 405 METHOD_NOT_ALLOWED. On ROUND_CHANGED fetch state and ask the user to select a party for the new round.

## Shared civic plaza squads

Each joined account commands a fixed roster of 18 units: `unit1`–`unit18`. Units 1–3 have appearance citizen1, 4–6 citizen2, through 16–18 citizen6. The server fixes appearances; units cannot be purchased or multiplied by client counts.

Responses additionally include `participants`, `unitCount`, `commanderCount`, `plazaModes`, `collectiveMoves`. Each public participant is `{id,ownerId,unitId,nickname,partyId,appearance,territoryId,mode,joinedAt,expiresAt,committedUntil,role}`. `ownerId` is the account's random opaque current-round participant UUID, never an account ID or deterministic account hash. Presence `id` combines ownerId and unitId. Role is derived on every response: `defender` when the party owns the building, `attacker` when another party owns it, and `contesting` for neutral territory. Ownership changes automatically change roles. Unit counts count avatars; commander counts count distinct ownerIds.

`player` additionally exposes `ownerId`, legacy `participantId`, `units:[{id,unitId,appearance,presence,ready,committedUntil}]`, and `presences`. Every roster unit is returned, including undeployed units with null presence. `ready` means no active vigil commitment, independently of energy or global cooldown. Legacy `presence` is the first deployed own unit or null; `appearance` is the last deployment's first unit appearance.

- `{action:'deploy',territoryId,mode,unitIds,roundId,requestId}` deploys or moves selected units, costing **0 points and 1 energy per unique unit** with shared 10-second cooldown. Send all 18 IDs to deploy the whole roster. Presence lasts 10 minutes, shortened at the round boundary. The batch validates every selected unit, energy, commitment and global capacity before mutation. Any failure rejects the entire batch. Duplicate IDs are deduplicated. Legacy appearance-only deployment selects the first unit with that appearance. Optional appearance alongside unitIds must match every selected unit. Deployment restarts only selected units' minute timers. Maximum 1000 deployed units globally. Support needs another same-party unit in the final deployment, including another own unit deployed in the same batch.
- `{action:'leave',unitIds?,roundId,requestId}` recalls selected own units; omitted unitIds recalls all own units. Leave is free and always allowed for a joined player, including during cooldown or vigil; it does not clear cooldown. Unknown roster IDs reject the whole command; valid undeployed IDs are harmless.
- `{action:'collective',territoryId,moveId,roundId,requestId}` costs **20 points and 10 energy**, with shared 10-second cooldown. conference requires at least 3 same-party rally units; jointBill requires at least 3 same-party petition units. Multiple units owned by one account count. At least one qualifying unit must belong to the caller. Each adds 80 influence, capped by maxScore. `result.participantCount` and `result.unitCount` report qualifying units; `result.commanderCount` reports their distinct commanders. No client counts are accepted.

Modes and per-full-minute influence: solo 4; rally 4, increased to 8 with at least 3 same-party rally units; vigil 6 for the first 5 minutes then 4; support 6 while another same-party unit is at the territory otherwise 0; petition 4. Closing the page leaves units present until expiry or explicit recall. Contribution remains direct paid influence only. Passive influence affects party territory scores.

A vigil is a symbolic five-minute unit commitment with no health system. Deploying a committed unit fails VIGIL_COMMITTED; other units remain available. `act` optionally accepts unitIds and rejects committed selected units. Without selection, act is available unless every roster unit is committed. Collective checks its qualifying own units, independently of other vigil units. Leave always works. Office upgrades use ordinary cooldown and price rules.

Rules expose `presenceMs:600000`, `deployEnergy:1`, `vigilMs:300000`, `plazaTickMs:60000`, `maxParticipants:1000`, `unitsPerPlayer:18`. Existing single presences migrate into the first fixed slot matching their appearance, retaining owner UUID and timers. No wallet/energy balances reset during migration. Each unit has a server-only next tick. GET and POST settle chronological ticks through CAS, preventing duplicate accrual. Grouped party/territory counts avoid per-unit peer scans. Final full minute at expiry is credited before pruning; no partial minute is credited. Round rollover discards old-round presences and scores. Debit, batch mutations and receipts commit together; retries cannot deploy or charge twice.

Additional errors: 400 INVALID_MODE / INVALID_APPEARANCE / INVALID_UNIT; 409 PLAZA_FULL / SUPPORT_REQUIRED / VIGIL_COMMITTED / COLLECTIVE_REQUIRED. Unknown fields, including owner IDs, counts or influence, reject with INVALID_INPUT. A replay returns the original receipt and fresh state and cannot resurrect departed units.
