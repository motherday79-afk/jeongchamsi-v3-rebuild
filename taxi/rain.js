// Procedural in-cabin rain: a subdued outside bed and short roof-panel impacts.
export function fillRoofRain(data,sampleRate,random=Math.random){
 let bed=0;
 for(let i=0;i<data.length;i++){
  bed=(bed+.025*(random()*2-1))/1.04;
  data[i]=bed*.55;
 }
 for(let at=0;at<data.length;at+=Math.max(1,Math.floor(sampleRate*(.025+random()*.095)))){
  const length=Math.floor(sampleRate*(.035+random()*.065));
  const strength=.07+random()*.19,frequency=480+random()*950;
  for(let n=0;n<length;n++){
   const t=n/sampleRate,attack=Math.min(1,n/(sampleRate*.001));
   const tick=(random()*2-1)*Math.exp(-t/.0035);
   const panel=(Math.sin(2*Math.PI*frequency*t)+.38*Math.sin(2*Math.PI*frequency*1.71*t))*Math.exp(-t/.014);
   data[(at+n)%data.length]+=strength*attack*(tick*.6+panel*.4);
  }
 }
 // Join the low background seamlessly; impulses already wrap at the boundary.
 const join=Math.min(256,Math.floor(data.length/2));
 const difference=data[data.length-1]-data[0];
 for(let n=0;n<join;n++)data[n]+=difference*(1-n/join);
}
export function createTaxiRain(ctx,output){
 const buffer=ctx.createBuffer(2,ctx.sampleRate*29,ctx.sampleRate);
 for(let ch=0;ch<2;ch++)fillRoofRain(buffer.getChannelData(ch),ctx.sampleRate);
 const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
 const cabin=ctx.createBiquadFilter();cabin.type='lowpass';cabin.frequency.value=3400;
 source.connect(cabin);cabin.connect(output);source.start();return source;
}
