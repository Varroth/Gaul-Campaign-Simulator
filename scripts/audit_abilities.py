"""Generate source-anchored faction ability coverage metrics (no false Verified claims).

Usage: python scripts/audit_abilities.py upstream/Infernal_Warriors.cat
The upstream clone is read-only and is not modified by the audit.
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

root=Path(__file__).resolve().parents[1]
unitfile=Path(sys.argv[1] if len(sys.argv)>1 else 'upstream/Infernal_Warriors.cat')
source=(root/'catalogue.js').read_text(encoding='utf-8')
match=re.search(r'const ENGINE_ABILITY_NAMES=new Set\(\[([\s\S]*?)\]\);',source)
if not match:raise SystemExit('Missing audited ability recognition registry')
modeled=set(re.findall(r"'([^']+)'",match.group(1)))
partial={'Afflicted Ferocity','Ashen Chain','Relic Plate','Greater Daemon','Legion Rush','Relic Mobility','Pursuit Column','Fast Spearhead'}

def local(x):return x.tag.rsplit('}',1)[-1]
def p(root,*names):
    nodes=[root]
    for name in names:nodes=[node for r in nodes for node in r if local(node)==name]
    return nodes

def abilities(unit):
    return [(profile.get('name',''),next((c.text or '' for c in profile.iter() if local(c)=='characteristic' and c.get('name')=='Description'),''))
            for profile in p(unit,'profiles','profile') if profile.get('typeName')=='Ability']

xml=ET.parse(unitfile).getroot()
units=[u for u in p(xml,'selectionEntries','selectionEntry') if u.get('type')=='unit' and u.get('hidden')!='true']
characters=[u for u in p(xml,'selectionEntries','selectionEntry') if u.get('type')=='model' and any(a[0]=='Leader eligibility / attachments' for a in abilities(u))]
ignored=('Unit rule /','Wargear /','Unit composition /','ROSTER CARD','Chaplain counted','LEADER Assignment','Mortal war-host','Passenger Manifest','Orbital Delivery restriction')
entries={}
for u in units+characters:
    entries[u.get('name')]=[{'ability':name,'status':'partial' if name in partial else 'modeled' if name in modeled else 'reference',
                            'description':desc[:250]}
                           for name,desc in abilities(u) if not name.startswith(ignored) and 'conditions' not in name.lower() and name not in {'BLOODLETTER INVOCATION — paid Reserve requirement','Two flight configurations (mandatory declare at muster)'}]
flat=[a for acts in entries.values() for a in acts]
counts=Counter(a['status'] for a in flat)
print('INFERNAL_ABILITY_COVERAGE',json.dumps({'sourceRevision':xml.get('revision'),'unitEntries':len(units),'charactersWithLeaderRules':len(characters),
      'modeledAbilityDescriptors':counts['modeled'],'partiallyModeledDescriptors':counts['partial'],'referenceOnlyDescriptors':counts['reference'],
      'referenceOnlyNamedAbilities':sorted({a['ability'] for a in flat if a['status']=='reference'})},ensure_ascii=False))
assert len(units)>=74,'Source removed/rearranged unit entries; review integration before auto-updating'
assert len(characters)>=5,'Leader model entries missing; review bundled Chaplain parser'
assert all(x in entries for x in ('Lost Cohort — Power Armour','Lost Cohort — Terminator Armour','Balan Bannon','Varroth','Orvath Krail'))
assert all(name in {a['ability'] for x in entries.values() for a in x} for name in ('Afflicted Ferocity','Guardian of Discipline','Veteran of Diesor II'))
print('INFERNAL_ABILITY_COVERAGE_AUDIT_PASS')
