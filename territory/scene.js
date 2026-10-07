// Persistent scene nodes keep each real participant's animation alive across polls.
const modes = {solo:'1인 시위',rally:'함께 집회',vigil:'상징 단식',support:'응원 방문',petition:'공동 발의'};
const zones = {solo:[12,60],rally:[38,65],vigil:[73,60],support:[24,85],petition:[62,83]};
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
    root.innerHTML = '<div class="scene-sky"><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span></div><img class="scene-building" alt="" width="680" height="420"><div class="plaza-ground"></div><div class="scene-zone zone-solo">시민의 목소리</div><div class="scene-zone zone-rally">함께하는 집회</div><div class="scene-zone zone-vigil">조용한 연대</div><div class="scene-zone zone-petition">정책 제안대</div><div class="podium" aria-hidden="true"><span>시민 기자회견</span><i></i></div><div class="bill-table" aria-hidden="true">공동 법안 <span>▤</span></div><div class="scene-people"></div><div class="scene-empty">아직 광장에 나온 시민이 없어요.<br>첫 발걸음을 남겨 주세요.</div><div class="scene-event" role="status" aria-live="polite"></div>';
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
    const grouped = {};
    for (const person of people) {
      (grouped[person.mode] ||= []).push(person);
    }
    for (const [mode,group] of Object.entries(grouped)) {
      group.sort((a,b) => Number(b.id === state.player?.participantId) - Number(a.id === state.player?.participantId) || a.id.localeCompare(b.id));
      const cap = 8;
      let overflow = this.root.querySelector(`[data-overflow="${mode}"]`);
      if (!overflow) { overflow = document.createElement('span'); overflow.className = 'crowd-overflow'; overflow.dataset.overflow = mode; this.root.append(overflow); }
      overflow.hidden = group.length <= cap;
      overflow.textContent = `+${Math.max(0,group.length-cap)}명 함께`;
      overflow.style.left = `${zones[mode]?.[0] || 50}%`;
      overflow.style.top = `${Math.min(94,(zones[mode]?.[1] || 60)+10)}%`;
      grouped[mode] = group.slice(0,cap);
    }
    this.root.querySelectorAll('[data-overflow]').forEach(node => { if (!grouped[node.dataset.overflow]) node.hidden = true; });
    const visible = Object.values(grouped).flat();
    const ids = new Set(visible.map(p => p.id));
    for (const [id,node] of this.nodes) if (!ids.has(id)) { node.remove(); this.nodes.delete(id); }
    for (const person of visible) {
      let node = this.nodes.get(person.id);
      if (!node) { node = document.createElement('button'); node.type = 'button'; node.dataset.person = person.id; this.root.querySelector('.scene-people').append(node); this.nodes.set(person.id,node); }
      const team = state.parties.find(p => p.id === person.partyId);
      node.dataset.party = person.partyId;
      const group = grouped[person.mode];
      const index = group.indexOf(person);
      const [x,y] = zones[person.mode] || zones.solo;
      const mine = person.id === state.player?.participantId;
      const key = `${person.mode}|${person.appearance}|${person.nickname}|${mine}`;
      if (node.dataset.key !== key) {
        node.dataset.key = key;
        node.className = `scene-person mode-${person.mode}${mine ? ' is-mine' : ''}`;
        node.innerHTML = '<span class="actor-prop"></span>' + avatarMarkup(person.appearance) + '<span class="actor-name"></span>';
        node.querySelector('.actor-name').textContent = `${mine ? '나 · ' : ''}${person.nickname || '시민'}`;
        node.querySelector('.actor-prop').textContent = {solo:'우리의 목소리',rally:'함께 바꿔요',vigil:'상징 단식',support:'응원해요!',petition:'공동 발의'}[person.mode] || '';
      }
      node.setAttribute('aria-label',`${mine ? '내 캐릭터, ' : ''}${person.nickname || '시민'}, ${team?.name || ''}, ${modes[person.mode] || ''}`);
      node.title = `${person.nickname || '시민'} · ${team?.name || ''} · ${modes[person.mode] || ''}`;
      node.style.setProperty('--party',/^#[0-9a-f]{6}$/i.test(team?.color) ? team.color : '#58a78b');
      // Fill each activity zone in rows; no invented citizens or crowd multipliers.
      const columns = Math.min(3,Math.max(2,Math.ceil(Math.sqrt(group.length))));
      node.style.left = `${Math.min(92,x + (index % columns - (columns-1)/2) * 6)}%`;
      node.style.top = `${Math.min(91,y + Math.floor(index/columns)*5)}%`;
      node.style.zIndex = String(Math.round(y + Math.floor(index/columns)*3));
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
