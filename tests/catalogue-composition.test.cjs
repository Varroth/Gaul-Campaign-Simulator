const test=require('node:test');
const assert=require('node:assert/strict');
global.DOMParser=require('@xmldom/xmldom').DOMParser;
const C=require('../catalogue');
const unitProfile='<profiles><profile typeName="Unit"><characteristics><characteristic name="M">6</characteristic><characteristic name="T">4</characteristic><characteristic name="Sv">3+</characteristic><characteristic name="W">2</characteristic><characteristic name="OC">1</characteristic></characteristics></profile></profiles>';
const model=(id,cost,min)=>`<selectionEntry id="${id}" name="${id}" type="model"><costs><cost name="pts" value="${cost}"/></costs><constraints><constraint type="min" field="selections" value="${min}"/></constraints></selectionEntry>`;
const parse=body=>C.parseCatalogue(`<catalogue revision="1"><selectionEntries><selectionEntry id="squad" name="Squad" type="unit">${unitProfile}${body}</selectionEntry></selectionEntries></catalogue>`,'AD','fixture').units[0];
test('mandatory repeated models are charged once at their own costs',()=>{
 const t=parse(`<selectionEntries>${model('sergeant',30,1)}${model('trooper',10,4)}${model('optional',100,0)}</selectionEntries>`);
 assert.equal(t.models,5);assert.equal(t.points,70);
});
test('only the selected personnel branch contributes models and points',()=>{
 const t=parse(`<selectionEntryGroups><selectionEntryGroup id="size" name="Squad Size / Personnel" defaultSelectionEntryId="small"><constraints><constraint type="min" field="selections" value="1"/><constraint type="max" field="selections" value="1"/></constraints><selectionEntries><selectionEntry id="small" name="5 models" type="upgrade"><selectionEntries>${model('s',20,1)}${model('m',10,4)}</selectionEntries></selectionEntry><selectionEntry id="large" name="10 models" type="upgrade"><selectionEntries>${model('other',10,10)}</selectionEntries></selectionEntry></selectionEntries></selectionEntryGroup></selectionEntryGroups>`);
 assert.equal(t.models,5);assert.equal(t.points,60);
});
test('optional personnel group remains empty even when its child has a minimum',()=>{
 const t=parse(`<selectionEntries>${model('core',20,1)}</selectionEntries><selectionEntryGroups><selectionEntryGroup id="optional" name="Optional specialist"><constraints><constraint type="min" field="selections" value="0"/><constraint type="max" field="selections" value="1"/></constraints><selectionEntries>${model('specialist',80,1)}</selectionEntries></selectionEntryGroup></selectionEntryGroups>`);
 assert.equal(t.models,1);assert.equal(t.points,20);
});
