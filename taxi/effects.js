// Synthesized door latch, panel impact and braking; no recording required.
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
 noise(door,.09,2100,.42,1.1);noise(door+.045,.075,1150,.26,.9);
 noise(door+.10,.28,680,.17,.7);tone(door+.12,.16,310,170,.07);
 tone(door+.68,.23,150,65,.34);noise(door+.68,.19,780,.48,.8);
 noise(door+.70,.08,1750,.30,1.1);noise(door+.79,.065,2400,.22,1.3);
 return ()=>{for(const node of nodes)try{node.stop();}catch{}};
}
