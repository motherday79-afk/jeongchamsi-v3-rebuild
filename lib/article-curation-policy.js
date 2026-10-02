export const hasArticleEdits=state=>!!(state?.excluded?.length||Object.keys(state?.placements||{}).length||Object.values(state?.snapshots||{}).some(row=>row.restoredAt));
export const isArticleCurationEnabled=state=>!!(state?.enabledAt||state?.updatedAt||hasArticleEdits(state));
