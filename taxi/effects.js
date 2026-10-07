// Short, quiet mechanical sounds synthesized locally; no downloaded sound effects.
export function playTaxiEffect(ctx,kind){
 const nodes=[];const base=ctx.currentTime+.025;
 function noise(offset,length,frequency,volume,q=1){
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),a=buffer.getChannelData(0);
  for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);
  const source=ctx.createBufferSource();source.buffer=buffer;
  const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=q;
  const gain=ctx.createGain(),at=base+offset;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(at);source.stop(at+length);nodes.push(source);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 function tone(offset,length,from,to,volume){
  const osc=ctx.createOscillator(),gain=ctx.createGain(),at=base+offset;osc.type='sine';osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(to,at+length);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+length);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+length);nodes.push(osc);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 const door=kind==='exit'?.5:0;
 if(kind==='exit'){noise(0,.4,1050,.065,2);tone(.03,.29,830,410,.018);noise(.12,.3,260,.06);}
 noise(door,.075,2400,.15,1.3);noise(door+.07,.25,550,.075,.7);tone(door+.1,.17,260,150,.02);
 tone(door+.68,.2,115,46,.22);noise(door+.68,.14,650,.2,.8);noise(door+.76,.055,2200,.07,1.5);
 return ()=>{for(const node of nodes)try{node.stop();}catch{}};
}
