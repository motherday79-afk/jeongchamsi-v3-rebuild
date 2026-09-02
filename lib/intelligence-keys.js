const PREFIX='jcsr2:intelligence:v1';

const clean=value=>String(value||'').trim().replace(/[^a-zA-Z0-9._:-]/g,'').slice(0,120);

export const INTELLIGENCE_KEYS=Object.freeze({
  prefix:PREFIX,
  job:kind=>`${PREFIX}:job:${clean(kind)}`,
  draft:(snapshotId,personId)=>`${PREFIX}:draft:${clean(snapshotId)}:${clean(personId)}`,
  published:(snapshotId,personId)=>`${PREFIX}:published:${clean(snapshotId)}:${clean(personId)}`,
  raw:(snapshotId,personId,source)=>`${PREFIX}:raw:${clean(snapshotId)}:${clean(personId)}:${clean(source)}`,
  validation:snapshotId=>`${PREFIX}:validation:${clean(snapshotId)}`,
  rankings:snapshotId=>`${PREFIX}:rankings:${clean(snapshotId)}`,
  history:snapshotId=>`${PREFIX}:history:${clean(snapshotId)}`,
  historyIndex:`${PREFIX}:history:index`,
  publicPointer:`${PREFIX}:public:pointer`,
  latestDraft:`${PREFIX}:draft:latest`,
});
