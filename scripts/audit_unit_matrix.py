#!/usr/bin/env python3
"""Read-only, per-unit verification gap audit of New Recruit source XML."""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

REQUIRED = ('M','T','Sv','W','Ld','OC')
BASELINE={'Despoiler Cadre','Infernal Berzerkers','Void Breachers',
          'Ashen Chain Terminators','Lost Cohort — Power Armour',
          'Lost Cohort — Terminator Armour','Bloodmarked Thralls','Chainbound Reavers'}

def children(parent,*steps):
    found=[parent]
    for step in steps:
        found=[c for node in found for c in node if c.tag.rsplit('}',1)[-1]==step]
    return found

def descendants(parent,name):
    return [node for node in parent.iter()
            if node is not parent and node.tag.rsplit('}',1)[-1]==name]

def field(profile,key):
    return next((n.text.strip() for n in descendants(profile,'characteristic')
                 if n.get('name')==key and n.text),'')

def points(unit):
    costs=[n for n in children(unit,'costs','cost')
           if n.get('name','').lower() in ('pts','points')]
    if not costs: return None
    val=float(costs[0].get('value','0'))
    return int(val) if val.is_integer() else val

def unit_abilities(unit):
    return [p.get('name','') for p in children(unit,'profiles','profile')
            if p.get('typeName')=='Ability']

def formations(unit):
    g=next((g for g in children(unit,'selectionEntryGroups','selectionEntryGroup')
            if 'required unit size and formation' in g.get('name','').lower()),None)
    if g is None:return [],None
    choices=[]
    for option in children(g,'selectionEntries','selectionEntry'):
        label=option.get('name','')
        match=re.search(r'(?<!\d)(\d{1,2})\s+(?:models?|afflicted)\b',label,re.I)
        choices.append({'id':option.get('id'),'label':label,
                        'models':int(match.group(1)) if match else None,
                        'points':points(option)})
    chosen=next((x for x in choices if x['id']==g.get('defaultSelectionEntryId')),None)
    return choices,chosen or next(iter(choices),None)

def analyze(unit,index):
    name=unit.get('name','')
    choices,default=formations(unit)
    stat_profile=next((x for x in children(unit,'profiles','profile')
                       if x.get('typeName')=='Unit'),None)
    stats=[v for v in REQUIRED if stat_profile is not None and field(stat_profile,v)]
    groups=descendants(unit,'selectionEntryGroup')
    selectable=[g for g in groups if len(children(g,'selectionEntries','selectionEntry'))>1]
    modifiers=descendants(unit,'modifier')
    conditions=descendants(unit,'condition')
    links=[x.get('targetId') for x in descendants(unit,'infoLink')
           if x.get('type')=='profile' and x.get('targetId')]
    inline={x.get('id') for x in descendants(unit,'profile')}
    unresolved=sorted({x for x in links if x not in index and x not in inline})
    weapons=[index[x] for x in set(links) if x in index]
    variable=sorted({p.get('name','') for p in weapons
                     if not re.fullmatch(r'\d+(?:\.\d+)?',field(p,'A'))
                     or not re.fullmatch(r'\d+(?:\.\d+)?',field(p,'D'))})
    metadata=('ROSTER CARD','Wargear /','Unit rule /','Unit composition /',
              'Mortal war-host','LEADER Assignment','Leader assignment instructions')
    abilities=[x for x in unit_abilities(unit) if not x.startswith(metadata)]
    blockers=[]
    if len(stats)!=len(REQUIRED):blockers.append('Incomplete source characteristics')
    if default is None or default['models'] is None:blockers.append('Default model count needs review')
    if not default or (default['points'] is None and points(unit) is None):
        blockers.append('No directly resolved starting points')
    if len(choices)>1:blockers.append('Alternative formation combat tests needed')
    if selectable:blockers.append('Equipment and selection legality incomplete')
    if modifiers or conditions:blockers.append('Conditional modifiers and points need audit')
    if unresolved:blockers.append('Some referenced profiles unresolved in source')
    if variable:blockers.append('Variable attacks and damage need exact resolution')
    if abilities:blockers.append('Named abilities require condition-specific tests')
    blockers.append('Shared engine lacks complete edition-specific mechanics')
    return {'sourceId':unit.get('id'),'name':name,'default':default,
            'formations':[{'label':x['label'],'models':x['models'],'points':x['points']}
                          for x in choices],
            'availableStats':stats,'selectableGroups':len(selectable),
            'modifierCount':len(modifiers),'conditionCount':len(conditions),
            'linkedWeaponProfiles':len(weapons),'unresolvedProfileIds':unresolved,
            'variableWeapons':variable,'sourceAbilities':abilities,
            'blockers':blockers,'verified':False}

def markdown(report):
    lines=['# Infernal Warriors — per-unit verification blockers','',
           'New Recruit source revision: '+str(report['revision']),
           'Source Git blob SHA: '+report['blobSha'],'',
           'Root units audited: '+str(report['unitCount'])+
           '; characters with Leader rules: '+str(report['leaderCount'])+
           '; fully Verified: 0.','',
           'This is a gap audit, NOT certification of complete combat rules.','',
           '| Unit | Models | Default pts | Formations | Option menus | Modifiers | Ability descriptors | Blockers |',
           '|---|---:|---:|---:|---:|---:|---:|---:|']
    for u in report['units']:
        form=u['default'] or {}
        fmt=lambda v:'—' if v is None else str(v)
        lines.append('| '+' | '.join((u['name'].replace('|','/'),
             fmt(form.get('models')),fmt(form.get('points')),
             str(len(u['formations'])),str(u['selectableGroups']),
             str(u['modifierCount']),str(len(u['sourceAbilities'])),
             str(len(u['blockers']))))+' |')
    lines.extend(['','## Individual findings',''])
    for u in report['units']:
        lines.extend(['### '+u['name'],'',
                      'Source entry ID: '+str(u['sourceId']),'',
                      *['- '+x for x in u['blockers']],''])
        if u['variableWeapons']:
            lines.extend(['Variable weapon profiles: '+', '.join(u['variableWeapons']),''])
    lines.extend(['','Full Verified requires all six source-pinned checks: stats, points, weapons, abilities, composition, and deterministic combat tests. No badges or source files are changed by this report.',''])
    return '\n'.join(lines)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('source',type=Path)
    parser.add_argument('--out',type=Path,default=Path('verification-artifacts'))
    args=parser.parse_args()
    raw=args.source.read_bytes()
    blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    root=ET.fromstring(raw)
    entries=children(root,'selectionEntries','selectionEntry')
    units=[x for x in entries if x.get('type')=='unit' and x.get('hidden')!='true']
    leaders=[x for x in entries if x.get('type')=='model'
             and 'Leader eligibility / attachments' in unit_abilities(x)]
    missing=BASELINE-{x.get('name') for x in units}
    if len(units)<74 or missing:
        raise SystemExit(f'Unexpected source: {len(units)} units; missing {sorted(missing)}')
    index={p.get('id'):p for p in descendants(root,'profile')
           if p.get('typeName')=='Weapon' and p.get('id')}
    rows=[analyze(x,index) for x in units]
    report={'generatedAt':datetime.now(timezone.utc).isoformat(),
            'revision':root.get('revision'),'blobSha':blob,
            'unitCount':len(units),'leaderCount':len(leaders),
            'verifiedCount':0,'units':rows}
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'infernal-unit-audit.json').write_text(
        json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    summary=markdown(report)
    (args.out/'infernal-unit-audit.md').write_text(summary,encoding='utf-8')
    counts=Counter(flag for row in rows for flag in row['blockers'])
    print('INFERNAL_UNIT_AUDIT_PASS',json.dumps({'revision':root.get('revision'),
         'blobSha':blob,'units':len(units),'leaders':len(leaders),
         'blockers':counts},ensure_ascii=False))
    import os
    if os.getenv('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as out:
            out.write('\n'.join(summary.splitlines()[:86])+'\n')

if __name__=='__main__':main()
