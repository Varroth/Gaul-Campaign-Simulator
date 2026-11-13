"""Browser configuration end-to-end test, including real select controls."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import time
import subprocess
import socket
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial

root=Path(__file__).resolve().parents[1]
def weapon(pid,name,range_,a,s,ap,d):
 return f'<profile id="{pid}" name="{name}" typeName="Weapon"><characteristics><characteristic name="Range">{range_}</characteristic><characteristic name="A">{a}</characteristic><characteristic name="BS/WS">3+</characteristic><characteristic name="S">{s}</characteristic><characteristic name="AP">{ap}</characteristic><characteristic name="D">{d}</characteristic></characteristics></profile>'
def entry(pid,name,profiles,points=None,subgroups=''):
 return f'<selectionEntry id="{pid}" name="{name}" type="upgrade">'+(f'<costs><cost name="pts" value="{points}"/></costs>' if points is not None else '')+'<infoLinks>'+''.join(f'<infoLink type="profile" targetId="{x}"/>' for x in profiles)+'</infoLinks>'+f'<selectionEntryGroups>{subgroups}</selectionEntryGroups></selectionEntry>'
def group(pid,name,default,entries):
 return f'<selectionEntryGroup id="{pid}" name="{name}" defaultSelectionEntryId="{default}"><selectionEntries>'+''.join(entries)+'</selectionEntries></selectionEntryGroup>'
def formation(n,pts):
 slots=''
 for model in range(1,n+1):
  base=f'{n}-{model}'
  slots+=group(f'slot-{base}',f'{"Champion" if model==1 else "Warrior"} {model} — choose exact wargear',f'{base}-bolt',
    [entry(f'{base}-bolt','chainaxe, bolt pistol',['bolt','chainaxe']),entry(f'{base}-plasma','chainaxe, plasma pistol',['plasma','chainaxe'])])
 return entry(f'formation-{n}',f'{n} models',[],pts,slots)
xml='''<?xml version="1.0"?><catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema" revision="99"><selectionEntries>'''
xml+='''<selectionEntry type="unit" id="test-berzerker" name="Infernal Berzerkers"><profiles><profile name="Infernal Berzerkers" typeName="Unit"><characteristics><characteristic name="M">6</characteristic><characteristic name="T">4</characteristic><characteristic name="Sv">3+</characteristic><characteristic name="W">3</characteristic><characteristic name="OC">2</characteristic></characteristics></profile></profiles><selectionEntryGroups>'''
xml+=group('required','Required unit size and formation','formation-5',[formation(5,115),formation(10,220)])+'</selectionEntryGroups></selectionEntry>'
xml+='''<selectionEntry type="model" id="test-chaplain" name="Infernal Chaplain"><costs><cost name="pts" value="75"/></costs><categoryLinks><categoryLink name="Character"/></categoryLinks><profiles><profile typeName="Unit" name="Infernal Chaplain"><characteristics><characteristic name="M">6</characteristic><characteristic name="T">4</characteristic><characteristic name="Sv">3+</characteristic><characteristic name="W">5</characteristic><characteristic name="OC">1</characteristic></characteristics></profile><profile typeName="Ability" name="Leader eligibility / attachments"><characteristics><characteristic name="Description">Infernal Berzerkers; Despoiler Cadre. A standard bodyguard normally has one Leader.</characteristic></characteristics></profile></profiles><infoLinks><infoLink type="profile" targetId="bolt"/><infoLink type="profile" targetId="chainaxe"/></infoLinks></selectionEntry>'''
xml+='''</selectionEntries><sharedProfiles>'''+weapon('bolt','Bolt pistol','12&quot;',2,4,0,1)+weapon('plasma','Plasma pistol','12&quot;',1,8,-2,2)+weapon('chainaxe','Chainaxe','Melee',4,5,-1,1)+'''</sharedProfiles></catalogue>'''
server=ThreadingHTTPServer(('127.0.0.1',0), partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=__import__('os').environ.get('BROWSER_EXECUTABLE') or __import__('shutil').which('chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1350,'height':960})
 # Parse the synthetic New Recruit catalogue before boot and stash it for offline startup.
 import re
 page.set_content(re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', (root/'index.html').read_text()))
 page.add_script_tag(content=(root/'engine.js').read_text())
 page.add_script_tag(content=(root/'catalogue.js').read_text())
 data=page.evaluate('xml => GaulCatalogue.parseCatalogue(xml,"IW","fixture-sha")',xml)
 squad=next(t for t in data['units'] if t['name']=='Infernal Berzerkers')
 leader=next(t for t in data['units'] if t['name']=='Infernal Chaplain')
 assert squad['formationConfigs'] and len(squad['formationConfigs'])==2, squad
 assert len(squad['formationConfigs'][0]['slots'])==5, squad['formationConfigs'][0]
 assert len(squad['formationConfigs'][1]['slots'])==10
 assert leader['isLeader'] and leader['models']==1 and leader['points']==75 and 'Infernal Berzerkers' in leader['leaderTargets']
 result=page.evaluate('({squad,leader})=>{GaulEngine.registerLinked("IW",[squad,leader]);let v=GaulCatalogue.configureUnit(squad,{formationId:"formation-10",gear:{"slot-10-1":"10-1-plasma"},leaderId:leader.id},[leader]);GaulEngine.registerConfiguration(v);return {v,shots:GaulEngine.attackProfiles(v,"ranged",11),after:GaulEngine.attackProfiles(v,"ranged",1),g:GaulEngine.createGame({player:[v.id],enemy:["ad-armor"]})};}',{'squad':squad,'leader':leader})
 v=result['v'];assert v['models']==11 and v['bodyguardModels']==10 and v['points']==295,v
 assert {(w['name'],w.get('isLeader',False)):w['count'] for w in v['loadout'] if w['mode']=='ranged'}=={('Bolt pistol',False):9,('Plasma pistol',False):1,('Bolt pistol',True):1},v['loadout']
 assert sum(w['activeCount']*w['attacks'] for w in result['shots'])==21,result['shots']
 assert sum(w['activeCount']*w['attacks'] for w in result['after'])==2,result['after']
 assert len(result['g']['units'])==2
 # Exercise UI via offline cached catalogues, then change formation, gear and leader.
 page.evaluate('data=>{const memory={};Object.defineProperty(window,"localStorage",{configurable:true,value:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v}});window.localStorage.setItem(GaulCatalogue.CACHE_KEY,JSON.stringify({v:GaulCatalogue.CACHE_VERSION,cachedAt:Date.now(),catalogues:{IW:{version:"fixture-sha",revision:"99",units:data}}}));}',data['units'])
 page.add_script_tag(content=(root/'app.js').read_text())
 page.locator('[data-tab="builder"]').click()
 page.locator('#faction-filter').select_option('IW')
 page.locator('#unit-search').fill('Infernal Berzerkers')
 page.locator('#points-limit').select_option('2000')
 page.locator(f'button[data-add="{squad["id"]}"]').click()
 page.locator('button[data-edit-side="player"]').last.click()
 page.locator('select[data-config-kind="formation"]').select_option('formation-10')
 page.locator('select[data-config-slot="slot-10-1"]').select_option('10-1-plasma')
 page.locator('select[data-config-kind="leader"]').select_option(leader['id'])
 body=page.locator('#muster-list').inner_text()
 assert '295 pts' in body and 'Infernal Chaplain' in body,body
 assert page.locator('#apply-musters').is_enabled()
 page.locator('#apply-musters').click()
 page.locator('#save-game').click()
 saved=page.evaluate('JSON.parse(localStorage.getItem("gaul-campaign-sim-v2"))')
 assert any(x.get('leaderId')==leader['id'] and x['formationId']=='formation-10' for x in saved['configurations']),saved['configurations']
 assert any(x['template']==v['id'] for x in saved['game']['units'])
 page.locator('#load-game').click()
 assert 'Battle restored.' in page.locator('#battle-feedback').inner_text()
 print('SAVE/LOAD VERIFIED: configured formation and Leader survive browser storage')
 print('BROWSER CONFIGURATION VERIFIED:',v['models'],'models,',v['points'],'points, 10 size slots and leader attachment')
 browser.close()
