import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const outputDir=fileURLToPath(new URL('../assets/og/',import.meta.url));
mkdirSync(outputDir,{recursive:true});

const cards=[
  ['jcs-main.png','JEONGCHAMSI','POLITICS · DATA · PARTICIPATION','#101f31','#135d67','#d7ab54'],
  ['jcs-politician.png','POLITICIAN DATA','PUBLIC PROFILE & DATA','#122238','#195a70','#e3b65c'],
  ['jcs-column.png','JEONGCHAMSI COLUMN','PERSPECTIVE & ANALYSIS','#161f35','#57457c','#e5b664'],
  ['jcs-news.png','JEONGCHAMSI NEWS','TODAY’S POLITICAL SIGNAL','#102438','#176277','#73d5cd'],
  ['jcs-itsme.png',"JEONGCHAMSI IT’S ME",'POLICY & PUBLIC PROPOSAL','#17253b','#754a82','#f0a85d'],
  ['jcs-community.png','JEONGCHAMSI COMMUNITY','CITIZEN VOICE','#122b32','#247066','#d7b85d'],
  ['jcs-academy.png','JEONGCHAMSI ACADEMY','POLITICAL DATA LEARNING','#17233a','#36568d','#dcad55'],
  ['jcs-evaluation.png','NATIONAL EVALUATION','CITIZEN CHOICE','#16253b','#6d496f','#dfb759'],
  ['jcs-generation.png','GENERATION CHOICE','PRESIDENTIAL PREFERENCE','#10273a','#296b79','#e6ad55'],
  ['jcs-president.png','JEONGCHAMSI PRESIDENT','PUBLIC OFFICE DATA','#172238','#554b7d','#ddb35d'],
  ['jcs-compare.png','POLITICAL COMPARE','A  VS  B','#11253a','#1a6870','#e5b15c']
];

for(const [file,title,subtitle,start,end,accent] of cards){
  const args=['-size','1200x630',`gradient:${start}-${end}`,
    '-fill','rgba(255,255,255,0.05)','-stroke','rgba(255,255,255,0.10)','-strokewidth','64','-draw','circle 1010,110 1240,110',
    '-fill','none','-stroke',accent,'-strokewidth','7','-draw','polyline 80,500 300,430 520,465 760,355 960,290 1140,130',
    '-fill',accent,'-stroke','none','-draw','roundrectangle 78,73 146,85 6,6',
    '-font','DejaVu-Sans-Bold','-fill','white','-pointsize','24','-draw',"text 164,91 'JEONGCHAMSI'",
    '-pointsize','62','-draw',`text 78,276 '${title.replace(/'/g,'')}'`,
    '-font','DejaVu-Sans','-fill','rgba(255,255,255,0.72)','-pointsize','26','-draw',`text 82,332 '${subtitle.replace(/'/g,'')}'`,
    '-fill',accent,'-draw','roundrectangle 80,386 162,392 3,3',
    '-fill','rgba(255,255,255,0.68)','-pointsize','20','-draw',"text 80,568 'WWW.JEONGCHAMSI.COM'",
    `${outputDir}${file}`];
  const result=spawnSync('convert',args,{encoding:'utf8'});
  if(result.status!==0)throw new Error(result.stderr||`Failed to generate ${file}`);
}
