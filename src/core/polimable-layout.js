// JCS 0.0.31.208 · POLIMARBLE CONNECTED 24-TILE LAYOUT
// Background remains the approved 1200×675 image.
// The 24 cells remain independent objects, but visually form one uninterrupted band.
// Route: START bottom-right → left → up left side → right across top → down right side → START.

const pct=(value,total)=>Number((value/total*100).toFixed(4));
const W=1200,H=675;
const tile=(index,x,y,w,h,band)=>Object.freeze({
  index,
  x:pct(x,W),
  y:pct(y,H),
  w:pct(w,W),
  h:pct(h,H),
  band
});

export const POLIMARBLE_24_TILE_LAYOUT=Object.freeze([
  // bottom band · 8 cells, touching edge-to-edge
  tile(0,684,540,92,70,'bottom'),
  tile(1,592,540,92,70,'bottom'),
  tile(2,500,540,92,70,'bottom'),
  tile(3,408,540,92,70,'bottom'),
  tile(4,316,540,92,70,'bottom'),
  tile(5,224,540,92,70,'bottom'),
  tile(6,132,540,92,70,'bottom'),
  tile(7,40,540,92,70,'bottom'),

  // left band · 4 cells, touching bottom/top bands
  tile(8,40,470,92,70,'left'),
  tile(9,40,400,92,70,'left'),
  tile(10,40,330,92,70,'left'),
  tile(11,40,260,92,70,'left'),

  // top band · 8 cells, shorter height to preserve the building silhouette
  tile(12,40,205,92,55,'top'),
  tile(13,132,205,92,55,'top'),
  tile(14,224,205,92,55,'top'),
  tile(15,316,205,92,55,'top'),
  tile(16,408,205,92,55,'top'),
  tile(17,500,205,92,55,'top'),
  tile(18,592,205,92,55,'top'),
  tile(19,684,205,92,55,'top'),

  // right band · 4 cells, touching top/bottom bands
  tile(20,684,260,92,70,'right'),
  tile(21,684,330,92,70,'right'),
  tile(22,684,400,92,70,'right'),
  tile(23,684,470,92,70,'right')
]);
