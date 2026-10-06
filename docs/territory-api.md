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
