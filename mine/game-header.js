// Add every new full-screen minigame to this registry with its illustrated title.
export const GAME_TITLES={
 raid:'/assets/mine/world-raid-title-309.webp',
 quests:'/assets/mine/quest-title-310.webp',
 valley:'/assets/mine/valley-316/title.png'
};
export function setGameHeader(heading,panel,title){
 heading.textContent=title;
 const art=GAME_TITLES[panel];
 if(art){heading.dataset.gameTitle=panel;heading.style.setProperty('--game-title-art',`url("${art}")`);}
 else{delete heading.dataset.gameTitle;heading.style.removeProperty('--game-title-art');}
}
