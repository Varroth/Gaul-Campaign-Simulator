"""Audit transport and Bloodletter Invocation assumptions against the source XML.

This validates a narrow, safe source mapping. It does not award Verified badges,
implement every mission rule or certify full vehicle/transport behavior.
"""
import argparse
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

EXPECTED_CAPACITIES={
 'Razorback Fire-support Carrier':6,
 'Rhino Carrier':10,
 'Land Raider':12,
 'Spartan Assault Tank':20,
 'Mastodon Heavy Transport':30,
}

def tag(element):
 return element.tag.rsplit('}',1)[-1]

def parse(path):
 root=ET.parse(path).getroot()
 entries={e.get('name'):e for e in root.iter() if tag(e)=='selectionEntry' and e.get('type')=='unit'}
 records=[]
 for name,expected in EXPECTED_CAPACITIES.items():
  unit=entries.get(name)
  if unit is None:raise AssertionError(f'Missing source transport {name}')
  abilities=[]
  for profile in unit.iter():
   if tag(profile)=='profile' and profile.get('typeName')=='Ability':
    desc=' '.join(c.text or '' for c in profile.iter() if tag(c)=='characteristic' and c.get('name')=='Description')
    abilities.append(desc)
  text=' '.join(abilities)
  found=[int(x) for x in re.findall(r'\bcapacity\s*:?\s*(\d{1,2})\b',text,re.I)]
  if expected not in found:raise AssertionError(f'{name}: capacity changed, expected {expected}, saw {found}')
  if name=='Rhino Carrier' and not re.search(r'no Terminators',text,re.I):
   raise AssertionError('Rhino restrictions have changed.')
  if name=='Razorback Fire-support Carrier' and not re.search(r'no Terminator',text,re.I):
   raise AssertionError('Razorback restrictions have changed.')
  if name in ('Land Raider','Spartan Assault Tank','Mastodon Heavy Transport') and not re.search(r'Terminators?\s+(?:count|takes?|using|occupies?)\s+(?:as\s+)?two|Terminator(?:s)?\s+uses?\s+two|each Terminator occupies two',text,re.I):
   raise AssertionError(name+' Terminator space wording needs audit.')
  records.append({'name':name,'capacity':expected,'sourceSupported':True})
 thralls=entries.get('Bloodmarked Thralls');blood=entries.get('Bloodletters')
 if thralls is None or blood is None:raise AssertionError('Invoker or Bloodletters missing from source catalogue.')
 abilityTexts=[]
 for p in thralls.iter():
  if tag(p)=='profile' and p.get('name')=='Bloodletter Invocation':
   abilityTexts.extend(c.text or '' for c in p.iter() if tag(c)=='characteristic' and c.get('name')=='Description')
 invocation=' '.join(abilityTexts)
 for pattern in [r'Once per battle PER ARMY',r'already bought and placed in Reserves',
                 r'wholly within 6"',r'more than 9"',r'not Battle-shocked',
                 r'No free']:
  if not re.search(pattern,invocation,re.I):
   raise AssertionError('Bloodletter Invocation changed or unavailable: '+pattern)
 return {'sourceRevision':root.get('revision'),'groundTransports':records,
         'bloodletterInvocationSourceChecked':True,'completeRulesVerified':False}

def main():
 a=argparse.ArgumentParser()
 a.add_argument('catalogue',type=Path)
 args=a.parse_args()
 result=parse(args.catalogue)
 print('RESERVES_TRANSPORT_AUDIT',json.dumps(result,ensure_ascii=False))
 print('PASS: source-grounded capacities and Bloodletter Invocation wording; no full Verified claims.')

if __name__=='__main__':main()
