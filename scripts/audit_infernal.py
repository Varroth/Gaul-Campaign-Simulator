"""Audit Infernal Warriors default formation sizes, points and linked equipment.

Reads the upstream repo checked out by GitHub Actions. The output is a source
coverage report, NOT a claim of full combat-rules verification.
"""
from __future__ import annotations
import json
import re
import sys
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

TAG=lambda node: node.tag.rsplit('}',1)[-1]

def kids(node,name): return [x for x in node if TAG(x)==name]
def path(node,*parts):
    nodes=[node]
    for part in parts:nodes=[c for n in nodes for c in kids(n,part)]
    return nodes

def choices(node):
    group=next((g for g in path(node,'selectionEntryGroups','selectionEntryGroup') if 'required unit size and formation' in g.get('name','').lower()),None)
    if group is None:return None,[]
    opts=path(group,'selectionEntries','selectionEntry')
    return next((x for x in opts if x.get('id')==group.get('defaultSelectionEntryId')),opts[0] if opts else None), opts

def price(node):
    for x in path(node,'costs','cost'):
        if x.get('name','').lower()=='pts':
            try:return float(x.get('value',''))
            except ValueError:return None
    return None

def get_roots(xml):
    found={}
    for x in path(xml,'selectionEntries','selectionEntry'):
        if x.get('type')=='unit' and x.get('hidden')!='true':found[x.get('id')]=x
    return list(found.values())

def walk_selected(node):
    selected=[]
    def go(x):
        selected.append(x)
        for g in path(x,'selectionEntryGroups','selectionEntryGroup'):
            entries=path(g,'selectionEntries','selectionEntry')
            if entries:
                default=next((c for c in entries if c.get('id')==g.get('defaultSelectionEntryId')),entries[0])
                go(default)
    go(node)
    return selected

def main():
    pathxml=Path(sys.argv[1] if len(sys.argv)>1 else 'upstream/Infernal_Warriors.cat')
    root=ET.parse(pathxml).getroot()
    roots=get_roots(root)
    profiles={p.get('id'):p for p in root.iter() if TAG(p)=='profile' and p.get('typeName')=='Weapon'}
    result=[]
    for unit in roots:
        name=unit.get('name','')
        default,options=choices(unit)
        option_name=default.get('name','') if default is not None else None
        match=re.search(r'\b(\d{1,2})\s+models?\b',option_name or '',re.I)
        models=int(match.group(1)) if match else None
        points=price(default) if default is not None else price(unit)
        branches=walk_selected(default or unit)
        linked=[profiles.get(link.get('targetId')) for x in branches for link in path(x,'infoLinks','infoLink') if link.get('type')=='profile']
        linked=[p for p in linked if p is not None]
        weapons=[p.get('name','') for p in linked]
        result.append({'name':name,'id':unit.get('id'),'models':models,'points':points,'default':option_name,'sizeOptions':len(options),'defaultWeaponLinks':len(weapons),'sampleWeapons':list(dict.fromkeys(weapons))[:8]})
    summary={'sourceRevision':root.get('revision'),'unitCount':len(result),'unitsWithSizeOptions':sum(u['sizeOptions']>0 for u in result),'unitsWithDefaultWeaponLinks':sum(u['defaultWeaponLinks']>0 for u in result),'unitsWithDeclaredPrice':sum(u['points'] is not None and u['points']>0 for u in result),'unresolved': [u['name'] for u in result if not (u['models'] and u['points'] and u['defaultWeaponLinks'])]}
    print('INFERNAL_WARRIORS_AUDIT',json.dumps(summary,ensure_ascii=False))
    for item in result:
        print('UNIT',json.dumps(item,ensure_ascii=False,separators=(',',':')))
    critical={'Infernal Berzerkers':(5,115),'Despoiler Cadre':(5,100),'Bloodmarked Thralls':(10,45),'Chainbound Reavers':(5,55),'Void Breachers':(5,115)}
    by_name={x['name']:x for x in result}
    failures=[]
    for name,(models,points) in critical.items():
        unit=by_name.get(name)
        if not unit or unit['models']!=models or unit['points']!=points:
            failures.append((name,unit))
    if len(result)!=74 or failures:
        print('ERROR: Upstream source structure or expected default profiles changed:',failures)
        return 1
    print('AUDIT_PASS: 74 root entries and five previously mispriced formations checked')
    return 0

if __name__=='__main__':raise SystemExit(main())
