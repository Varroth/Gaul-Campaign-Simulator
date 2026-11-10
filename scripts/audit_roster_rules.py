"""Source-anchored roster restriction audit for Alpha 0.7.

Reads only the user-owned New Recruit XML in a GitHub Actions checkout.
Asserts a handful of explicitly verified *source structures*, not complete
Warhammer rules verification or battlefield test outcomes.
"""
from __future__ import annotations
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

def local(node):return node.tag.rsplit('}',1)[-1]
def children(node,name):return [n for n in node if local(n)==name]
def path(node,*names):
    nodes=[node]
    for name in names:nodes=[c for n in nodes for c in children(n,name)]
    return nodes

def max_roster(node):
    vals=[]
    for c in path(node,'constraints','constraint'):
        if c.get('scope')=='roster' and c.get('field')=='selections' and c.get('type')=='max':
            try:vals.append(int(float(c.get('value',''))))
            except ValueError:pass
    return min(vals) if vals else None

def leader_eligible(node):
    return any(p.get('name','').lower()=='leader eligibility / attachments' for p in node.iter() if local(p)=='profile')

def wargear_rules(node):
    result=[]
    for prof in node.iter():
        if local(prof)=='profile' and prof.get('name') in {'Wargear / legal alternatives','Unit composition / selectable wargear'}:
            result.extend(c.text or '' for c in prof.iter() if local(c)=='characteristic' and c.get('name')=='Description')
    return ' '.join(result)

def main():
    target=Path(sys.argv[1] if len(sys.argv)>1 else 'upstream/Infernal_Warriors.cat')
    xml=ET.parse(target).getroot()
    units=[u for u in path(xml,'selectionEntries','selectionEntry') if u.get('type')=='unit' and u.get('hidden')!='true']
    characters=[u for u in path(xml,'selectionEntries','selectionEntry') if u.get('type')=='model' and leader_eligible(u)]
    caps={u.get('name'):max_roster(u) for u in units}
    rules={u.get('name'):wargear_rules(u) for u in units}
    expected={'Despoiler Cadre':6,'Infernal Berzerkers':6,'Ashen Chain Terminators':3,
              'Lost Cohort — Power Armour':2,'Lost Cohort — Terminator Armour':2,
              'Chainbound Reavers':3,'Bloodmarked Thralls':3}
    failures={name:{'expected':cap,'actual':caps.get(name)} for name,cap in expected.items() if caps.get(name)!=cap}
    character_names={c.get('name') for c in characters}
    for name in ('Varroth','Orvath Krail','Balan Bannon','Infernal Chaplain','Infernal Terminator Chaplain'):
        if name not in character_names:failures[name]='Missing source leader'
    for name,term in [('Despoiler Cadre',r'one model per 5 may take power weapon'),
                       ('Chainbound Reavers',r'for every full five models, one Reaver may replace autopistol with a hand flamer')]:
        if not re.search(term,rules.get(name,''),flags=re.I):failures[name]='Source weapon quota text changed'
    profiles=[p for p in xml.iter() if local(p)=='profile' and p.get('typeName')=='Weapon']
    traits=Counter((c.text or '').strip() for p in profiles for c in p.iter() if local(c)=='characteristic' and c.get('name')=='Traits')
    audit={'revision':xml.get('revision'),'rootUnits':len(units),'sourceLeaders':len(characters),
           'rootUnitsWithCaps':sum(v is not None for v in caps.values()),
           'criticalLimits':expected,'recognizedTraits':{t:sum(t.lower() in x.lower() for x in traits) for t in ('Torrent','Rapid Fire','Heavy','Twin-linked','Sustained Hits','Melta')},
           'unmodeledRules':['nested equipment conditions','enhancements/detachment costs','leader auras','Lost Cohort control','indirect fire','Hazardous','Precision','psychic abilities']}
    print('IW_ROSTER_RULE_AUDIT',json.dumps(audit,ensure_ascii=False))
    if len(units)!=74:failures['rootUnits']=f'Expected 74, got {len(units)}'
    if failures:
        print('AUDIT_FAILURE',json.dumps(failures,ensure_ascii=False));return 1
    print('IW_ROSTER_RULE_AUDIT_PASS')
    return 0

if __name__=='__main__':raise SystemExit(main())
