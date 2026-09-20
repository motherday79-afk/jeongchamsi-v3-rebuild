// JCS 0.0.31.227 · POLIMARBLE visual object map
// DESIGN SOURCE OF TRUTH: polimable-board-base-31-227.png (1672×941)
// The image is the ONE AND ONLY board/background image.
// Each board cell + HUD panel is mapped as an independent transparent DOM object.
// No gameplay rules are attached in this stage.

const cell=(index,side,corner,x,y,w,h)=>Object.freeze({index,side,corner,x,y,w,h});
const hud=(id,x,y,w,h)=>Object.freeze({id,x,y,w,h});

export const POLIMARBLE_32_TILE_LAYOUT=Object.freeze([
  // 0 START corner / bottom-right
  cell(0,'bottom',true,79.665,68.650,14.115,15.197),

  // bottom: right -> left
  cell(1,'bottom',false,71.352,73.007,8.433,12.115),
  cell(2,'bottom',false,62.919,72.901,8.672,12.221),
  cell(3,'bottom',false,54.426,72.795,8.732,12.434),
  cell(4,'bottom',false,45.993,72.689,8.732,12.646),
  cell(5,'bottom',false,37.500,72.582,8.672,12.752),
  cell(6,'bottom',false,28.947,72.476,8.792,12.965),
  cell(7,'bottom',false,20.096,72.264,9.091,13.284),

  // 8 plaza corner / bottom-left
  cell(8,'bottom',true,5.622,68.650,14.175,15.303),

  // left: bottom -> top
  cell(9,'left',false,9.988,62.380,10.825,7.226),
  cell(10,'left',false,10.407,55.473,10.885,7.439),
  cell(11,'left',false,10.825,48.672,11.005,7.439),
  cell(12,'left',false,11.244,41.764,11.124,7.439),
  cell(13,'left',false,11.663,34.750,11.244,7.545),
  cell(14,'left',false,12.141,27.843,11.364,7.545),
  cell(15,'left',false,12.620,20.829,11.423,7.651),

  // 16 fate corner / top-left
  cell(16,'top',true,14.533,11.052,11.722,11.052),

  // top: left -> right
  cell(17,'top',false,25.718,12.540,6.878,10.733),
  cell(18,'top',false,32.356,12.540,6.818,10.840),
  cell(19,'top',false,38.935,12.540,6.938,10.840),
  cell(20,'top',false,45.574,12.540,7.057,10.840),
  cell(21,'top',false,52.392,12.540,6.998,10.840),
  cell(22,'top',false,59.151,12.540,7.057,10.840),
  cell(23,'top',false,65.969,12.540,7.117,10.840),

  // 24 tour corner / top-right
  cell(24,'top',true,72.309,11.052,11.065,11.371),

  // right: top -> bottom
  cell(25,'right',false,76.435,20.935,9.629,7.758),
  cell(26,'right',false,77.033,27.843,9.809,7.651),
  cell(27,'right',false,77.632,34.750,9.928,7.651),
  cell(28,'right',false,78.230,41.658,10.048,7.651),
  cell(29,'right',false,78.828,48.565,10.167,7.758),
  cell(30,'right',false,79.486,55.473,10.227,7.864),
  cell(31,'right',false,80.084,62.380,10.407,7.970)
]);

export const POLIMARBLE_HUD_LAYOUT=Object.freeze([
  hud('player-1',1.10,0.80,24.50,15.20),
  hud('player-2',74.20,0.80,24.70,15.20),
  hud('strategy-cards',0.70,77.40,26.00,21.60),
  hud('today-ranking',29.20,77.10,41.60,22.10),
  hud('dice-box',72.40,77.20,26.70,21.80)
]);

export const POLIMARBLE_CORNER_INDICES=Object.freeze([0,8,16,24]);
