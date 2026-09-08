import test from 'node:test';
import assert from 'node:assert/strict';
import { attachRepresentativeBadges } from '../api/gateway.js';

function memoryCommand(seed={}){
  const values=new Map(Object.entries(seed));
  return async args=>args[0]==='GET'?(values.get(args[1])??null):null;
}

test('content responses attach the authors current representative badge without rewriting posts',async()=>{
  const stored={items:[{id:'post-1',ownerId:'member',author:'정참시민',representativeBadge:'old-value'}]};
  const command=memoryCommand({'jcsr2:useractivity:v1:member':JSON.stringify({representativeBadge:'first-penguin'})});
  const enriched=await attachRepresentativeBadges(command,stored);
  assert.equal(enriched.items[0].representativeBadge,'first-penguin');
  assert.equal(stored.items[0].representativeBadge,'old-value');
});
