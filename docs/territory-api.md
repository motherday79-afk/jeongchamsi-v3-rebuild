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

## Shared civic plaza

Responses additionally include `participants`, `plazaModes`, `collectiveMoves`. Each public participant is `{id,nickname,partyId,appearance,territoryId,mode,joinedAt,expiresAt,committedUntil}`. `id` is a random opaque UUID, never an account ID or deterministic account hash. `player` additionally includes `participantId`, `presence` (the matching public participant or null), and `appearance` (last chosen appearance, default citizen1). Existing actors safely gain an ID on their next mutation. Existing game states safely gain an empty participant list. Appearance persists for the current round. Existing `contribution` counts direct paid influence only; passive plaza influence is reflected in party territory scores.

- `{action:'deploy',territoryId,mode,appearance,roundId,requestId}` costs **0 points and 5 energy** and sets the shared 10-second cooldown. `appearance` must be citizen1 through citizen6. There is exactly one presence per account, across both territories. Deploying replaces that presence and starts a new full-minute timer. Presence lasts 10 minutes, shortened at the round boundary. At most 200 accounts can be present globally; a present account can still switch. Deploying support requires another same-party participant at that territory.
- `{action:'leave',roundId,requestId}` is always allowed for a joined player, including during cooldown or a vigil; it costs nothing and forfeits remaining presence benefits. It does not clear the existing cooldown. It is safe even when there is no presence.
- `{action:'collective',territoryId,moveId,roundId,requestId}` costs **20 points and 10 energy**, with shared 10-second cooldown. `conference` requires at least 3 actual same-party `rally` participants at this territory, including the caller. `jointBill` requires at least 3 actual same-party `petition` participants, including the caller. Each adds 80 influence, capped by maxScore; `result.participantCount` reports qualifying participants. Prices are fixed and exposed in `collectiveMoves`; no variable quote is used. Debit, energy, influence and receipt use the same atomic CAS transaction as existing actions.

Modes and per-full-minute influence: `solo` 4; `rally` 4, increased to 8 when at least 3 same-party rallies are simultaneously present; `vigil` 6 for the first 5 minutes, then 4; `support` 6 while another same-party participant remains at the territory, otherwise 0; `petition` 4. All deployed accounts are actual authenticated players. Closing the page does not immediately remove a presence; it lasts until explicit leave or expiry. No fabricated avatars or client-supplied counts are accepted.

A vigil is a symbolic five-minute commitment, with no health or starvation system. Before `committedUntil`, deploy, act, and collective actions fail with VIGIL_COMMITTED; leave is always allowed. Office upgrades remain available under ordinary cooldown and point rules. At commitment completion the presence stays until its normal expiry and can switch freely subject to cooldown.

Rules additionally expose `presenceMs:600000`, `deployEnergy:5`, `vigilMs:300000`, `plazaTickMs:60000`, `maxParticipants:200`. Each participant has a server-only next unprocessed tick; GET and POST settle ticks through CAS, so concurrent reads, retries, and late polling cannot accrue a minute twice. Ticks are processed chronologically, settling the old capture hold before score changes and establishing any new hold at the actual tick. The final full minute at expiry is credited before pruning. No partial minute is credited, and round rollover discards old-round presences and scores. Catch-up is bounded by 200 presences with at most 10 minute ticks each.

Additional errors: 400 INVALID_MODE / INVALID_APPEARANCE; 409 PLAZA_FULL / SUPPORT_REQUIRED / VIGIL_COMMITTED / COLLECTIVE_REQUIRED. Unknown POST fields (including claimed participant counts, identity, or influence) are rejected with INVALID_INPUT. A replay of a successful deploy returns the original receipt and fresh state; it cannot resurrect an expired or departed presence.
