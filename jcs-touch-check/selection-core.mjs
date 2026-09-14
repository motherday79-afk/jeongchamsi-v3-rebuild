export function createSelectionProbe(doc) {
 const body=doc.body, properties=['-webkit-user-select','user-select'];
 const previous=properties.map(name=>[name,body.style.getPropertyValue(name),body.style.getPropertyPriority(name)]);
 let enabled=false;
 return {
  enable(){if(enabled)return;for(const name of properties)body.style.setProperty(name,'text','important');enabled=true;},
  restore(){if(!enabled)return;for(const [name,value,priority] of previous){if(value)body.style.setProperty(name,value,priority);else body.style.removeProperty(name);}enabled=false;}
 };
}
export function nextCondition(results) {
 if(!results.selection)return 'selection';
 if(results.selection==='no'&&!results.original)return 'original';
 return 'done';
}
