// JCS 0.0.31.206 · POLIMARBLE 24-TILE BOARD LAYOUT
// DESIGN SOURCE: 1200×675 fixed background. The background image itself must not be changed.
// Route principle: START at bottom-right → move left → up the left side → right across the top → down the right side → START.
// Coordinates are percentages of the 1200×675 game canvas so the same board scales into mobile landscape.

const pct=(value,total)=>Number((value/total*100).toFixed(4));
const W=1200,H=675,TILE_W=82,TILE_H=62;
const tile=(index,x,y,band)=>Object.freeze({
  index,
  x:pct(x,W),
  y:pct(y,H),
  w:pct(TILE_W,W),
  h:pct(TILE_H,H),
  band
});

export const POLIMARBLE_24_TILE_LAYOUT=Object.freeze([
  // bottom band · START at right, then move left (8)
  tile(0,684,540,'bottom'),
  tile(1,592,540,'bottom'),
  tile(2,500,540,'bottom'),
  tile(3,408,540,'bottom'),
  tile(4,316,540,'bottom'),
  tile(5,224,540,'bottom'),
  tile(6,132,540,'bottom'),
  tile(7,40,540,'bottom'),

  // left band · bottom → top (4)
  tile(8,40,470,'left'),
  tile(9,40,400,'left'),
  tile(10,40,330,'left'),
  tile(11,40,260,'left'),

  // top band · left → right (8)
  tile(12,40,205,'top'),
  tile(13,132,205,'top'),
  tile(14,224,205,'top'),
  tile(15,316,205,'top'),
  tile(16,408,205,'top'),
  tile(17,500,205,'top'),
  tile(18,592,205,'top'),
  tile(19,684,205,'top'),

  // right band · top → bottom (4)
  tile(20,684,260,'right'),
  tile(21,684,330,'right'),
  tile(22,684,400,'right'),
  tile(23,684,470,'right')
]);
