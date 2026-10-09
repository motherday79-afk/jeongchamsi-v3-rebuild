// Bright celestial seals, with distinct animal and zodiac emblems.
const animals={
 '쥐띠':'<circle cx="32" cy="32" r="15"/><circle cx="88" cy="32" r="15"/><path d="M32 47Q32 30 60 32Q88 30 88 47L82 76Q60 99 38 76Z"/><path d="m28 66 17 4m-17 7 17-2m47-9-17 4m17 7-17-2"/>',
 '소띠':'<path d="M34 40Q15 38 20 17Q27 32 40 27m46 13q19-2 14-23Q93 32 80 27M35 38Q60 22 85 38L86 77Q60 99 34 77Z"/><ellipse cx="60" cy="77" rx="23" ry="13"/><path d="M48 76v3m24-3v3"/>',
 '호랑이띠':'<path d="M30 45Q17 14 43 28Q60 21 77 28Q103 14 90 45V73Q60 105 30 73Z"/><path d="M60 28v20m-10-12h20M31 53l12 5m-13 9 12 2m47-16-12 5m13 9-12 2"/>',
 '토끼띠':'<path d="M40 45Q22 4 40 8Q52 10 51 42M69 42Q68 10 80 8Q98 4 80 45"/><ellipse cx="60" cy="66" rx="30" ry="28"/>',
 '용띠':'<path d="m35 40-8-23 18 11 6-15 10 18 19-14-2 23Q97 49 88 70L76 87H44L29 74l11-15-12-8Z"/><path d="m77 44 19-4-8 14m-7 22 20 5M37 78l-17 6m32-3 8 10 10-10"/>',
 '뱀띠':'<path d="M34 88h42q23 0 17-17-5-12-22-12H52q-19 0-17-16 2-12 19-12h13q18 0 18 13t-18 13M33 78h40M50 68H36q-21 0-19 12t17 8"/><circle cx="72" cy="41" r="2"/><path d="m85 45 15 3m-3-1 5-5m-5 5 5 5"/>',
 '말띠':'<path d="m42 37-3-23 15 15 21-8 9 17 7 44-14 13-30-5-10-20 11-19-14-3 8-11Z"/><path d="m43 29-14 12-8 32 18-6m30-38 9 27M50 77l29 4"/>',
 '양띠':'<path d="M36 45C15 57 14 29 28 27q14-2 13 18m43 0c21 12 22-16 8-18q-14-2-13 18M40 36q-6-15 6-16 6-14 16-4 13-8 17 5 16 4 5 19"/><path d="M38 40v32q22 34 44 0V40"/>',
 '원숭이띠':'<circle cx="29" cy="59" r="13"/><circle cx="91" cy="59" r="13"/><ellipse cx="60" cy="57" rx="31" ry="36"/><path d="M60 42Q37 27 38 54q-11 12 0 24 22 20 44 0 11-12 0-24 1-27-22-12Z"/>',
 '닭띠':'<path d="M46 33Q31 8 47 12q10-10 17 1 17-9 15 7l-9 16M33 53q-8-25 27-24 32 0 28 31L76 84Q49 103 34 76Z"/><path d="m59 64 14 4-13 12-8-10Zm-7 17q-8 20 3 19 17 2 13-17"/>',
 '개띠':'<path d="M40 34Q20 23 17 52q-1 27 17 19m46-37q20-11 23 18 1 27-17 19M36 39q24-16 48 0v37q-24 24-48 0Z"/>',
 '돼지띠':'<path d="m33 43-7-26 25 12m36 14 7-26-25 12"/><ellipse cx="60" cy="61" rx="35" ry="32"/><ellipse cx="60" cy="74" rx="19" ry="12"/><path d="M53 72v5m14-5v5"/>'
};
const signs={
 '물병자리':'M24 44l12-10 12 10 12-10 12 10 12-10 12 10M24 69l12-10 12 10 12-10 12 10 12-10 12 10',
 '물고기자리':'M32 22q28 38 0 76m56-76q-28 38 0 76M24 60h72',
 '양자리':'M60 96V40C60 10 20 12 23 39q1 14 14 12m23 45V40c0-30 40-28 37-1q-1 14-14 12',
 '황소자리':'M24 22q4 29 36 29t36-29M60 51a24 24 0 1 0 0 48 24 24 0 1 0 0-48',
 '쌍둥이자리':'M25 25q35 15 70 0M25 95q35-15 70 0M43 31v58m34-58v58',
 '게자리':'M25 43q30-30 65-6M95 77q-30 30-65 6M39 38a13 13 0 1 0 0 26 13 13 0 1 0 0-26M81 56a13 13 0 1 0 0 26 13 13 0 1 0 0-26',
 '사자자리':'M35 63a15 15 0 1 0 0 30 15 15 0 1 0 0-30M48 70Q23 21 58 22q34 0 20 37L68 82q-6 21 21 13',
 '처녀자리':'M23 84V35q0-20 16-6v55-49q0-20 17-6v55-49q0-20 17-6v49q0 15 23 20M73 44q28-8 19 21-6 20-29 28',
 '천칭자리':'M23 94h74M23 75h24v-7a22 22 0 1 1 26 0v7h24',
 '전갈자리':'M20 86V35q0-20 17-6v57-51q0-20 17-6v57-51q0-20 17-6v46q0 15 24 11m-8-8 9 8-8 9',
 '사수자리':'M29 91 91 29M61 29h30v30M29 61l30 30',
 '염소자리':'M18 39q16-20 23 2l11 34 12-41q5-12 11-2l-3 45q0 21 21 16 21-9 5-25-14-10-26 9L56 99'
};
export function fortuneSignArt(tab,selection){
 const animal=animals[selection],sign=signs[selection];
 if(tab==='animal'&&!animal||tab==='star'&&!sign)return '';
 const eyes=['뱀띠','용띠','말띠','닭띠'].includes(selection)?'':'<circle cx="47" cy="57" r="2.5" fill="currentColor" stroke="none"/><circle cx="73" cy="57" r="2.5" fill="currentColor" stroke="none"/>';
 const index=Object.keys(tab==='animal'?animals:signs).indexOf(selection);
 const palette=[['#d7eee7','#608d88'],['#fde6df','#b7817b'],['#e0edf8','#6a8ca6']][index%3];
 const ticks=Array.from({length:12},(_,i)=>`<path d="M80 9v${i%3===0?7:3}" transform="rotate(${i*30} 80 80)"/>`).join('');
 // Decorative star orbit, separate from the traditional zodiac glyph.
 const points=[[25,55],[47,23],[103,18],[137,57],[128,112],[78,143],[25,111]];
 const orbit=points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${(i+index)%3===0?3:1.8}" fill="${i%2?'#dbada0':'#79b5c1'}"/>`).join('');
 return `<svg class="fortune-sign-art" viewBox="0 0 160 160" fill="none" aria-hidden="true" focusable="false"><circle cx="80" cy="80" r="76" fill="#f3faf9"/><circle cx="86" cy="75" r="60" fill="#edf4fc"/><circle cx="80" cy="80" r="65" fill="none" stroke="#a4cbd0"/><circle cx="80" cy="80" r="58" stroke="#bad9d4" stroke-dasharray="2 5"/><g stroke="#9abfc6">${ticks}</g><path d="m80 15 56 98H24Zm0 130L24 47h112Z" stroke="#b6d4d5" stroke-width=".8" opacity=".55"/>${tab==='star'?'<path d="M25 55 47 23 103 18 137 57 128 112 78 143 25 111" stroke="#a7c8d8" stroke-width="1"/>':''}${orbit}<circle cx="80" cy="80" r="48" fill="#fffdf8"/><g transform="translate(35 35) scale(.75)" color="${palette[1]}" fill="${tab==='animal'?palette[0]:'none'}" stroke="${palette[1]}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${tab==='animal'?animal+eyes:'<path d="'+sign+'" stroke-width="4"/>'}</g><path d="M140 31a11 11 0 1 1-13-16 9 9 0 0 0 13 16" fill="#a6bdd4"/><path d="m25 119 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#e5b095"/><circle cx="80" cy="15" r="3" fill="#e2bda0"/></svg>`;
}
