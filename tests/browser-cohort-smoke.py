"""End-to-end browser test for source-linked bundled Chaplain and control behavior."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from html import escape
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading
import re

root=Path(__file__).resolve().parents[1]

def stat(name,val):return f'<characteristic name="{name}">{escape(str(val))}</characteristic>'
def profile(name,typ,stats):return f'<profile name="{escape(name)}" typeName="{typ}"><characteristics>{"".join(stat(k,v) for k,v in stats.items())}</characteristics></profile>'
unitstats=dict(M='6"',T='4',Sv='3+',W='4',OC='1',Ld='6+')
leaderstats=dict(M='6"',T='5',Sv='3+',W='6',OC='1',Ld='6+')
bolt=profile('Bolt pistol','Weapon',dict(Range='12"',A=1,**{'BS/WS':'3+'},S=4,AP=0,D=1))
axe=profile('Chainaxe','Weapon',dict(Range='Melee',A=4,**{'BS/WS':'3+'},S=5,AP=-1,D=1))
unit=f'''<selectionEntry id="unit-cohort" name="Lost Cohort — Power Armour" type="unit">
<profiles>{profile('Lost Cohort — Power Armour','Unit',unitstats)}{profile('Afflicted Ferocity','Ability',{'Description':'Each afflicted gains +1 melee Attack. When its Chaplain dies test on 4+ each Command phase.'})}</profiles>
<selectionEntryGroups><selectionEntryGroup id="size" name="Required unit size and formation" defaultSelectionEntryId="cohort-10">
<selectionEntries><selectionEntry id="cohort-10" name="10 afflicted" type="upgrade"><costs><cost name="pts" value="365"/></costs><infoLinks><infoLink targetId="axe" type="profile"/><infoLink targetId="bolt" type="profile"/></infoLinks></selectionEntry></selectionEntries>
</selectionEntryGroup></selectionEntryGroups></selectionEntry>'''
leader=f'''<selectionEntry id="chap-1" name="Infernal Chaplain" type="model">
<costs><cost name="pts" value="75"/></costs>
<profiles>{profile('Infernal Chaplain','Unit',leaderstats)}{profile('Leader eligibility / attachments','Ability',{'Description':'Infernal Legionaries; Infernal Berzerkers. A standard bodyguard normally has one Leader.'})}</profiles>
<infoLinks><infoLink targetId="axe" type="profile"/><infoLink targetId="bolt" type="profile"/></infoLinks></selectionEntry>'''
xml=f'''<?xml version="1.0"?><catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema" revision="24"><selectionEntries>{unit}{leader}</selectionEntries><sharedProfiles>{axe.replace('<profile name=', '<profile id="axe" name=')}{bolt.replace('<profile name=', '<profile id="bolt" name=')}</sharedProfiles></catalogue>'''

server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', (root/'index.html').read_text()))
    page.add_script_tag(content=(root/'engine.js').read_text())
    page.add_script_tag(content=(root/'catalogue.js').read_text())
    page.wait_for_timeout(500)
    result=page.evaluate('xml => GaulCatalogue.parseCatalogue(xml,"IW","fixture-cohort-v8")',xml)
    c=next(x for x in result['units'] if x['name']=='Lost Cohort — Power Armour')
    l=next(x for x in result['units'] if x['name']=='Infernal Chaplain')
    assert c['bodyguardModels']==10 and c['models']==11 and c['points']==365,c
    assert c['leader']['name']=='Infernal Chaplain' and c['leader']['points']==0,c['leader']
    assert l['points']==75 and l['models']==1,l
    assert 'Afflicted Ferocity' in [x['name'] for x in c['abilities']],c['abilities']
    combo=page.evaluate('({c,l})=>{GaulEngine.registerLinked("IW",[c,l]);const v=GaulCatalogue.configureUnit(c,{formationId:"cohort-10"},[l]);GaulEngine.registerConfiguration(v);const g=GaulEngine.createGame({player:[v.id],enemy:["ad-unmarked"],seed:1});return {models:v.models,points:v.points,leader:v.leader,game:g,melee:GaulEngine.attackProfiles(v,"melee",11)};}',{'c':c,'l':l})
    assert combo['models']==11 and combo['points']==365 and combo['game']['units'][0]['leaderAlive'],combo
    assert combo['leader']['bundled'],combo['leader']
    assert any(w['attacks']>=5 for w in combo['melee'] if not w.get('isLeader')),combo['melee']
    assert not errors,errors
    print('BROWSER COHORT VERIFIED: ten afflicted plus one bundled 0-extra-points Chaplain, combat profile and parser loaded')
    browser.close()
