// Persistent scene nodes keep each real participant's animation alive across polls.
const modes = {solo:'1인 시위',rally:'함께 집회',vigil:'상징 단식',support:'응원 방문',petition:'공동 발의'};
const roleNames = {defender:'건물 앞 수비',attacker:'원거리 공성',contesting:'점령 도전'};
const palettes = ['#ef806f','#5ca2de','#78b98b','#e4ae52','#79bbc7','#e79db7'];
let spriteReady = false;
const sprite = new Image();
sprite.onload = () => { spriteReady = true; document.documentElement.classList.add('citizens-ready'); };
sprite.src = '/assets/territory/citizens-463.webp';
export function avatarMarkup(appearance = 'citizen1') {
  const index = Math.max(0,Math.min(5,Number(appearance.replace('citizen','')) - 1 || 0));
  return `<span class="citizen-art" style="--sprite-x:${index*20}%;--shirt:${palettes[index]}" aria-hidden="true"><svg class="citizen-fallback" viewBox="0 0 60 86"><ellipse cx="30" cy="81" rx="19" ry="4" fill="#163e3620"/><path d="M24 61L22 79M36 61L39 79" stroke="#354956" stroke-width="9" stroke-linecap="round"/><path d="M17 39L12 59M43 39L48 58" stroke="#efc4a0" stroke-width="8" stroke-linecap="round"/><rect x="17" y="35" width="26" height="31" rx="10" fill="${palettes[index]}"/><circle cx="30" cy="23" r="15" fill="#f3c9a7"/><path d="M15 22Q12 3 31 6Q48 7 45 24L39 17Q27 22 19 15Z" fill="#443d39"/><circle cx="25" cy="25" r="1.3"/><circle cx="35" cy="25" r="1.3"/><path d="M27 31Q30 34 34 30" fill="none" stroke="#9c6053" stroke-width="1.5"/></svg></span>`;
}
export class PlazaScene {
  constructor(root, onSelect) {
    this.root = root;
    this.nodes = new Map();
    this.seen = new Set();
    this.initialized = false;
    this.territoryId = '';
    this.onSelect = onSelect;
    root.innerHTML = '<div class="scene-sky"><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span></div><img class="scene-building" alt="" width="680" height="420"><div class="plaza-ground"></div><div class="formation-label defense-label"></div><div class="formation-label attack-label"></div><div class="siege-gap">건물 앞 수비선 ↔ 원거리 공성선</div><div class="party-flags"></div><div class="scene-people"></div><div class="scene-empty">아직 광장에 나온 시민이 없어요.<br>첫 발걸음을 남겨 주세요.</div><div class="scene-event" role="status" aria-live="polite"></div>';
    root.addEventListener('click',(event) => {
      const actor = event.target.closest('[data-person]');
      if (actor) this.onSelect(actor.dataset.person);
    });
  }
  update(state, territoryId) {
    const changed = this.territoryId !== territoryId;
    this.territoryId = territoryId;
    const people = (state.participants || []).filter(p => p.territoryId === territoryId);
    const image = this.root.querySelector('.scene-building');
    const url = `/assets/territory/${territoryId === 'bluehouse' ? 'blue-house' : 'assembly'}.webp`;
    if (image.getAttribute('src') !== url) image.src = url;
    image.alt = `${state.territories.find(t => t.id === territoryId)?.name || ''} 앞 시민 광장`;
    this.root.querySelector('.scene-empty').hidden = people.length > 0;
    const territory = state.territories.find(t => t.id === territoryId);
    const owner = state.parties.find(p => p.id === territory?.ownerPartyId);
    const roleOf = p => !territory?.ownerPartyId ? 'contesting' : p.partyId === territory.ownerPartyId ? 'defender' : 'attacker';
    this.root.querySelector('.defense-label').textContent = owner ? `${owner.name} · 건물 앞 수비` : '중립 건물 · 첫 점령 대기';
    this.root.querySelector('.attack-label').textContent = owner ? '공격 부대 · 원거리 집결선' : '점령 도전 부대 · 집결선';
    const flags = this.root.querySelector('.party-flags');
    flags.replaceChildren();
    for (const team of state.parties.filter(team => people.some(p => p.partyId === team.id))) {
      const flag = document.createElement('span');
      flag.textContent = `⚑ ${team.name} ${people.filter(p => p.partyId === team.id).length}기`;
      flag.style.setProperty('--party', /^#[0-9a-f]{6}$/i.test(team.color) ? team.color : '#58a78b');
      flags.append(flag);
    }
    // Own squad always renders in full. Other deployed units share the remaining scene budget.
    const own = people.filter(p => p.ownerId === state.player?.ownerId);
    const others = people.filter(p => p.ownerId !== state.player?.ownerId);
    const visible = [...own,...others.slice(0,Math.max(0,100-own.length))];
    const grouped = {};
    for (const person of visible) (grouped[roleOf(person)] ||= []).push(person);
    for (const group of Object.values(grouped)) group.sort((a,b) => Number(b.ownerId === state.player?.ownerId) - Number(a.ownerId === state.player?.ownerId) || a.id.localeCompare(b.id,undefined,{numeric:true}));
    let overflow = this.root.querySelector('.crowd-overflow');
    if (!overflow) { overflow = document.createElement('span'); overflow.className = 'crowd-overflow'; this.root.append(overflow); }
    overflow.hidden = people.length <= visible.length;
    overflow.textContent = `추가 ${people.length-visible.length}기 활동 중 · 총 ${people.length}기`;
    const ids = new Set(visible.map(p => p.id));
    for (const [id,node] of this.nodes) if (!ids.has(id)) { node.remove(); this.nodes.delete(id); }
    for (const person of visible) {
      let node = this.nodes.get(person.id);
      if (!node) { node = document.createElement('button'); node.type = 'button'; node.dataset.person = person.id; this.root.querySelector('.scene-people').append(node); this.nodes.set(person.id,node); }
      const team = state.parties.find(p => p.id === person.partyId);
      node.dataset.party = person.partyId;
      const role = roleOf(person);
      const group = grouped[role];
      const index = group.indexOf(person);
      const mine = person.ownerId === state.player?.ownerId;
      const key = `${person.mode}|${person.appearance}|${person.nickname}|${mine}|${role}`;
      if (node.dataset.key !== key) {
        node.dataset.key = key;
        node.className = `scene-person role-${role} mode-${person.mode}${mine ? ' is-mine' : ''}`;
        node.innerHTML = '<span class="actor-prop"></span>' + avatarMarkup(person.appearance) + '<span class="actor-name"></span>';
        node.querySelector('.actor-name').textContent = `${mine ? '#' + person.unitId.replace('unit','') : person.nickname || '시민'}`;
        node.querySelector('.actor-prop').textContent = {solo:'시위',rally:'집회',vigil:'단식',support:'응원',petition:'발의'}[person.mode] || '';
      }
      node.setAttribute('aria-label',`${mine ? '내 '+person.unitId+', ' : ''}${roleNames[role]}, ${person.nickname || '시민'}, ${team?.name || ''}, ${modes[person.mode] || ''}`);
      node.title = `${person.nickname || '시민'} · ${team?.name || ''} · ${modes[person.mode] || ''}`;
      node.style.setProperty('--party',/^#[0-9a-f]{6}$/i.test(team?.color) ? team.color : '#58a78b');
      // Six columns keep all 18 own units legible as three rows, on either side.
      const ownCount = group.filter(p => p.ownerId === state.player?.ownerId).length;
      const localIndex = mine ? index : index-ownCount;
      const columns = mine ? 6 : 12;
      const rows = Math.ceil((mine ? ownCount : group.length-ownCount)/columns);
      const startY = role === 'defender' ? 42 : 75;
      const endY = role === 'defender' ? 54 : 89;
      const x = mine ? 18+(localIndex%columns)*12.8 : 6+(localIndex%columns)*8;
      const y = startY+(rows > 1 ? Math.floor(localIndex/columns)/(rows-1)*(endY-startY) : 5)+(mine ? 0 : 1.7);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.style.zIndex = String(Math.round(y*2)+(mine ? 20 : 0));
      node.style.setProperty('--phase',`${-(index%7)*.41}s`);
    }
    for (const log of [...(state.logs || [])].reverse()) {
      if (!this.seen.has(log.id) && this.initialized && !changed && log.territoryId === territoryId) {
        if (log.type === 'capture') this.celebrate(`${state.parties.find(p => p.id === log.partyId)?.name || '정당'} 점령 성공!`,'capture');
        else if (log.type === 'collective' || ['conference','jointBill'].includes(log.moveId)) this.celebrate(log.moveId === 'jointBill' ? '함께 쓴 법안이 제출됐어요!' : '우리의 목소리, 기자회견 시작!',log.moveId === 'jointBill' ? 'bill' : 'conference',log.partyId);
      }
      this.seen.add(log.id);
    }
    if (this.seen.size > 500) this.seen = new Set((state.logs || []).map(l => l.id));
    this.initialized = true;
  }
  celebrate(text, type, partyId) {
    const event = this.root.querySelector('.scene-event');
    event.textContent = text;
    this.root.classList.remove('celebrating','conference-live');
    void this.root.offsetWidth;
    this.root.classList.add(type === 'capture' ? 'celebrating' : 'conference-live');
    this.root.querySelectorAll('.is-speaker').forEach(node => node.classList.remove('is-speaker'));
    if (type === 'conference') [...this.nodes.values()].find(node => node.classList.contains('mode-rally') && node.dataset.party === partyId)?.classList.add('is-speaker');
    clearTimeout(this.eventTimer);
    this.eventTimer = setTimeout(() => { event.textContent = ''; this.root.classList.remove('celebrating','conference-live'); this.root.querySelectorAll('.is-speaker').forEach(node => node.classList.remove('is-speaker')); },7000);
  }
}
