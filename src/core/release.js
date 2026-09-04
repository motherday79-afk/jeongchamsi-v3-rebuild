export const APP_RELEASE='JCS_0_0_31_10';

export function releaseMetadata(env={}){
  return {
    version:APP_RELEASE,
    commit:String(env.VERCEL_GIT_COMMIT_SHA||env.GITHUB_SHA||'').slice(0,8),
    deployment:String(env.VERCEL_DEPLOYMENT_ID||env.VERCEL_GIT_COMMIT_REF||'')
  };
}
