// JCS 0.0.31.225 · POLIMARBLE board-object stage 1
// DESIGN RULE: the approved board artwork is the only visual base.
// Every board cell is an independent, blank DOM object. No names, icons or game rules are attached yet.
// Coordinate system: percentage of the approved 1846×852 artwork.

const cell=(index,side,corner,x,y,w,h,polygon='0 0,100% 0,100% 100%,0 100%')=>Object.freeze({
  index,side,corner,x,y,w,h,polygon
});

export const POLIMARBLE_32_TILE_LAYOUT=Object.freeze([
  // 0 START corner / bottom-right
  cell(0,'bottom',true,71.45,72.25,12.15,17.75,'6% 0,92% 0,100% 88%,94% 100%,5% 100%,0 88%'),

  // bottom side: movement is right -> left
  cell(1,'bottom',false,62.90,76.35,9.55,13.10,'2% 0,98% 0,94% 100%,0 100%'),
  cell(2,'bottom',false,54.95,76.30,8.80,13.15,'2% 0,98% 0,96% 100%,0 100%'),
  cell(3,'bottom',false,47.25,76.20,8.55,13.20,'1% 0,99% 0,98% 100%,0 100%'),
  cell(4,'bottom',false,39.85,76.15,8.45,13.25,'1% 0,99% 0,99% 100%,0 100%'),
  cell(5,'bottom',false,33.15,76.10,7.85,13.25,'1% 0,99% 0,100% 100%,0 100%'),
  cell(6,'bottom',false,26.35,76.05,7.85,13.25,'1% 0,99% 0,100% 100%,0 100%'),
  cell(7,'bottom',false,19.55,76.00,7.85,13.35,'2% 0,99% 0,100% 100%,0 100%'),

  // 8 plaza corner / bottom-left
  cell(8,'bottom',true,6.55,72.35,14.45,17.70,'8% 0,94% 0,100% 88%,92% 100%,4% 100%,0 88%'),

  // left side: bottom -> top
  cell(9,'left',false,8.85,65.10,11.30,9.30,'0 4%,100% 0,94% 100%,0 96%'),
  cell(10,'left',false,9.75,57.65,11.25,8.70,'0 3%,100% 0,94% 100%,0 97%'),
  cell(11,'left',false,10.65,50.20,11.15,8.60,'0 3%,100% 0,94% 100%,0 97%'),
  cell(12,'left',false,11.55,42.80,11.05,8.45,'0 3%,100% 0,94% 100%,0 97%'),
  cell(13,'left',false,12.45,35.45,10.95,8.35,'0 3%,100% 0,94% 100%,0 97%'),
  cell(14,'left',false,13.35,28.05,10.85,8.35,'0 3%,100% 0,94% 100%,0 97%'),
  cell(15,'left',false,14.25,20.65,10.75,8.45,'0 4%,100% 0,94% 100%,0 96%'),

  // 16 choice corner / top-left
  cell(16,'top',true,17.10,10.75,11.05,11.55,'4% 0,96% 0,100% 88%,94% 100%,0 92%,0 12%'),

  // top side: left -> right
  cell(17,'top',false,26.65,12.35,7.65,10.85,'0 0,100% 0,98% 100%,2% 100%'),
  cell(18,'top',false,33.25,12.10,7.55,10.95,'0 0,100% 0,99% 100%,1% 100%'),
  cell(19,'top',false,39.75,11.95,7.50,11.10,'0 0,100% 0,100% 100%,0 100%'),
  cell(20,'top',false,46.20,11.90,7.55,11.10,'0 0,100% 0,100% 100%,0 100%'),
  cell(21,'top',false,52.65,11.90,7.55,11.10,'0 0,100% 0,100% 100%,0 100%'),
  cell(22,'top',false,59.10,12.00,7.60,11.00,'0 0,100% 0,99% 100%,1% 100%'),
  cell(23,'top',false,65.55,12.20,7.75,10.90,'0 0,100% 0,98% 100%,2% 100%'),

  // 24 tour corner / top-right
  cell(24,'top',true,70.65,10.70,10.85,12.20,'4% 0,96% 0,100% 12%,100% 90%,94% 100%,0 88%'),

  // right side: top -> bottom
  cell(25,'right',false,72.55,20.85,10.15,8.45,'0 0,100% 4%,100% 96%,6% 100%'),
  cell(26,'right',false,73.35,28.15,10.10,8.35,'0 0,100% 3%,100% 97%,6% 100%'),
  cell(27,'right',false,74.10,35.45,10.10,8.35,'0 0,100% 3%,100% 97%,6% 100%'),
  cell(28,'right',false,74.85,42.80,10.10,8.45,'0 0,100% 3%,100% 97%,6% 100%'),
  cell(29,'right',false,75.60,50.20,10.15,8.60,'0 0,100% 3%,100% 97%,6% 100%'),
  cell(30,'right',false,76.35,57.65,10.20,8.70,'0 0,100% 3%,100% 97%,6% 100%'),
  cell(31,'right',false,77.10,65.10,10.25,9.30,'0 0,100% 4%,100% 96%,6% 100%')
]);

export const POLIMARBLE_CORNER_INDICES=Object.freeze([0,8,16,24]);
