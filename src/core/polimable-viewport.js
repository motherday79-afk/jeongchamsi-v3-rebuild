// JCS 0.0.31.246 · POLIMARBLE responsive landscape viewport
// All internal game coordinates remain in the frozen 1672×941 logical space.
// Only the whole stage is uniformly scaled to the available viewport.

export const POLIMARBLE_LOGICAL_WIDTH=1672;
export const POLIMARBLE_LOGICAL_HEIGHT=941;

export function calculatePoliMarbleStage(viewportWidth,viewportHeight,insets={}){
  const left=Math.max(0,Number(insets.left)||0);
  const right=Math.max(0,Number(insets.right)||0);
  const top=Math.max(0,Number(insets.top)||0);
  const bottom=Math.max(0,Number(insets.bottom)||0);
  const gutter=Math.max(0,Number(insets.gutter ?? 4)||0);
  const availableWidth=Math.max(1,Number(viewportWidth)||1)-left-right-(gutter*2);
  const availableHeight=Math.max(1,Number(viewportHeight)||1)-top-bottom-(gutter*2);
  const widthScale=availableWidth/POLIMARBLE_LOGICAL_WIDTH;
  const heightScale=availableHeight/POLIMARBLE_LOGICAL_HEIGHT;
  const scale=Math.max(.05,Math.min(widthScale,heightScale));
  return Object.freeze({
    scale,
    width:POLIMARBLE_LOGICAL_WIDTH*scale,
    height:POLIMARBLE_LOGICAL_HEIGHT*scale,
    mode:heightScale<=widthScale?'height-fit':'width-fit',
    availableWidth,
    availableHeight
  });
}
