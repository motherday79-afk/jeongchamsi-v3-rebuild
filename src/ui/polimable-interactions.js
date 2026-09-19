const DICE_FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
const STEP_MS=230;

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const secureDie=()=>{
  try{
    if(globalThis.crypto?.getRandomValues){
      const buf=new Uint32Array(1);
      globalThis.crypto.getRandomValues(buf);
      return (buf[0]%6)+1;
    }
  }catch{}
  return Math.floor(Math.random()*6)+1;
};

function setPlayerToTile(root,index,{moving=false,react=false}={}){
  const player=root.querySelector('[data-pm-player]');
  const tile=root.querySelector(`[data-pm-tile="${index}"]`);
  if(!player||!tile)return null;
  const x=Number(tile.dataset.pmCx);
  const y=Number(tile.dataset.pmCy);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  for(const cell of root.querySelectorAll('.pm-board-tile.is-stepping'))cell.classList.remove('is-stepping');
  player.style.left=`${x}%`;
  player.style.top=`${y}%`;
  player.dataset.pmPosition=String(index);
  player.classList.toggle('is-moving',moving);
  if(react){
    void tile.offsetWidth;
    tile.classList.add('is-stepping');
  }
  return tile;
}

async function runMovementTest(root,button){
  if(button.disabled)return;
  const player=root.querySelector('[data-pm-player]');
  const result=root.querySelector('[data-pm-dice-result]');
  if(!player||!result)return;
  button.disabled=true;
  result.classList.add('is-rolling');
  result.textContent='🎲';
  await wait(260);
  const rolled=secureDie();
  result.textContent=DICE_FACES[rolled-1];
  result.classList.remove('is-rolling');
  let position=Number(player.dataset.pmPosition||0);
  for(let step=0;step<rolled;step+=1){
    position=(position+1)%24;
    const steppedTile=setPlayerToTile(root,position,{moving:true,react:true});
    await wait(STEP_MS);
    steppedTile?.classList.remove('is-stepping');
  }
  player.classList.remove('is-moving');
  button.disabled=false;
}

export async function hydratePoliMarble(root){
  const mount=root.querySelector?.('[data-pm-root]');
  if(!mount)return;
  setPlayerToTile(mount,0);
}

export function bindPoliMarbleInteractions(root){
  if(root.__jcsPolimable207Bound)return;
  root.__jcsPolimable207Bound=true;
  root.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-pm-test-roll]');
    if(!button)return;
    const mount=button.closest('[data-pm-root]');
    if(!mount)return;
    event.preventDefault();
    void runMovementTest(mount,button);
  });
}
