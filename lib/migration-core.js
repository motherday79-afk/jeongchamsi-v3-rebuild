export const LEGACY_DOMAINS = [
  'columns','community','itsme','polls','generation','nationalEvaluation','academy','comments'
];

export const legacyUserKey = () => 'jcv3:users:v2';
export const legacyActivityKey = userId => `jcv3:useractivity:v1:${String(userId || '').slice(0,24)}`;
export const legacyContentKey = domain => `jcv3:content:v4:${String(domain || '')}`;
export const legacyContentChunkKey = (domain,index) => `${legacyContentKey(domain)}:__chunk__:${index}`;

export async function decodeLegacyJson(raw, chunkLoader) {
  if (!raw) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  const chunks = Number(parsed?.chunks || 0);
  if (parsed?.__jcv3_chunked_json_v1__ !== 1 || !Number.isInteger(chunks) || chunks < 1) return parsed;
  const parts = [];
  for (let i=0;i<chunks;i+=1) {
    const encoded = await chunkLoader(i);
    if (typeof encoded !== 'string' || !encoded) throw new Error(`LEGACY_CHUNK_MISSING:${i}`);
    parts.push(Buffer.from(encoded,'base64'));
  }
  const joined = Buffer.concat(parts);
  if (Number(parsed.bytes) > 0 && joined.length !== Number(parsed.bytes)) throw new Error('LEGACY_CHUNK_SIZE_MISMATCH');
  return JSON.parse(joined.toString('utf8'));
}

function itemsOf(value){ return Array.isArray(value?.items) ? value.items : []; }

export function validateMigrationSnapshot(snapshot = {}) {
  const users = snapshot.users && typeof snapshot.users === 'object' ? snapshot.users : {};
  const userIds = new Set(Object.keys(users));
  const contents = snapshot.contents && typeof snapshot.contents === 'object' ? snapshot.contents : {};
  const postSets = new Map();
  const orphanPostOwners = [];
  const orphanCommentOwners = [];
  const orphanCommentPosts = [];

  for (const domain of ['columns','community','itsme']) {
    const ids = new Set();
    for (const post of itemsOf(contents[domain])) {
      if (post?.id) ids.add(String(post.id));
      if (post?.ownerId && !userIds.has(String(post.ownerId))) orphanPostOwners.push({domain,id:String(post.id||''),ownerId:String(post.ownerId)});
    }
    postSets.set(domain,ids);
  }

  for (const comment of itemsOf(contents.comments)) {
    const ownerId = String(comment?.ownerId || '');
    if (ownerId && !userIds.has(ownerId)) orphanCommentOwners.push({id:String(comment?.id||''),ownerId});
    const domain = String(comment?.domain || '');
    const postId = String(comment?.postId || '');
    if (postId && postSets.has(domain) && !postSets.get(domain).has(postId)) orphanCommentPosts.push({id:String(comment?.id||''),domain,postId});
  }

  const counts = {
    users: userIds.size,
    activities: Object.keys(snapshot.activities || {}).length,
    contents: Object.fromEntries(LEGACY_DOMAINS.map(d=>[d,itemsOf(contents[d]).length]))
  };
  return {
    ok: orphanPostOwners.length===0 && orphanCommentOwners.length===0 && orphanCommentPosts.length===0,
    counts, orphanPostOwners, orphanCommentOwners, orphanCommentPosts
  };
}
