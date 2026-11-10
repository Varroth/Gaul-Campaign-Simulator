"""Optional real-browser catalogue parser smoke test: python tests/browser-parser-smoke.py"""
from pathlib import Path
from playwright.sync_api import sync_playwright

home=Path(__file__).resolve().parents[1]
def weapon(pid,name,range_,attacks,strength,ap,damage):
    return f'<profile id="{pid}" name="{name}" typeName="Weapon"><characteristics><characteristic name="Range">{range_}</characteristic><characteristic name="A">{attacks}</characteristic><characteristic name="BS/WS">3+</characteristic><characteristic name="S">{strength}</characteristic><characteristic name="AP">{ap}</characteristic><characteristic name="D">{damage}</characteristic></characteristics></profile>'
def item(name, weapons):
    return '<selectionEntry type="upgrade" id="'+name.replace(' ','-')+'" name="'+name+'"><infoLinks>'+''.join(f'<infoLink type="profile" targetId="{pid}" />' for pid in weapons)+'</infoLinks></selectionEntry>'
def group(name,selected,options):
    return f'<selectionEntryGroup name="{name}" defaultSelectionEntryId="{selected}"><selectionEntries>'+''.join(options)+'</selectionEntries></selectionEntryGroup>'
def card(name, size,price,inner):
    selection=item(f'{size} models',[])
    chosen=selection.replace('</selectionEntry>',f'<selectionEntryGroups>{inner}</selectionEntryGroups></selectionEntry>')
    gr=group('Required unit size and formation',f'{size}-models',[chosen])
    return f'<selectionEntry type="unit" id="unit-{name}" name="{name}"><profiles><profile name="{name}" typeName="Unit"><characteristics><characteristic name="M">6</characteristic><characteristic name="T">4</characteristic><characteristic name="Sv">3+</characteristic><characteristic name="W">3</characteristic><characteristic name="OC">2</characteristic></characteristics></profile></profiles><selectionEntryGroups>{gr}</selectionEntryGroups></selectionEntry>'.replace(f'<selectionEntry type="upgrade" id="{size}-models" name="{size} models">',f'<selectionEntry type="upgrade" id="{size}-models" name="{size} models"><costs><cost name="pts" value="{price}"/></costs>')
# Five 5-model squad weapons: champion plasma + four boltguns, five chainaxes.
body=group('Champion 1 — weapons','champion', [item('Champion with plasma',['plasma','chainaxe']).replace('id="Champion-with-plasma"','id="champion"')])
for j in range(2,6):body+=group(f'Warrior {j} — weapons',f'warrior{j}',[item('Warrior with bolt pistol',['bolt','chainaxe']).replace('id="Warrior-with-bolt-pistol"',f'id="warrior{j}"')])
xml=f'''<?xml version="1.0"?><catalogue name="Infernal Warriors" revision="27" xmlns="http://www.battlescribe.net/schema/catalogueSchema"><selectionEntries>{card('Infernal Berzerkers',5,115,body)}</selectionEntries><sharedProfiles>{weapon('plasma','Plasma pistol','12&quot;',1,8,-2,2)}{weapon('bolt','Bolt pistol','12&quot;',2,4,0,1)}{weapon('chainaxe','Chainaxe','Melee',4,5,-1,1)}</sharedProfiles></catalogue>'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page()
    page.set_content('<html><body></body></html>')
    page.add_script_tag(content=(home/'catalogue.js').read_text())
    report=page.evaluate('xml => {const u=GaulCatalogue.parseCatalogue(xml,"IW","source-sha").units[0];return {models:u.models,points:u.points,estimated:u.estimated,options:u.sizeOptions,loadout:u.loadout,audit:u.audit,verification:u.verification};}',xml)
    assert report['models']==5,report
    assert report['points']==115,report
    assert report['estimated'] is False,report
    assert {w['name']:w['count'] for w in report['loadout']}=={'Bolt pistol':4,'Plasma pistol':1,'Chainaxe':5},report
    assert report['verification']=='synced',report
    print('BROWSER SOURCE PARSER OK:',report['models'],'models,',report['points'],'pts,',report['loadout'])

    # Exercise unusual composition encoding and serum restrictions.
    extras='''<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema"><selectionEntries>
      <selectionEntry type="unit" id="letters" name="Bloodletters"><categoryLinks><categoryLink name="Khorne Allies"/></categoryLinks><costs><cost name="pts" value="125"/></costs><profiles><profile typeName="Unit"><characteristics><characteristic name="W">1</characteristic><characteristic name="T">4</characteristic></characteristics></profile></profiles><selectionEntryGroups><selectionEntryGroup name="10 Bloodletters" defaultSelectionEntryId="hellblade-choice"><selectionEntries><selectionEntry id="hellblade-choice" name="10 Hellblades" type="upgrade"><infoLinks><infoLink type="profile" targetId="hellblade"/></infoLinks></selectionEntry></selectionEntries></selectionEntryGroup></selectionEntryGroups></selectionEntry>
      <selectionEntry type="unit" id="bikes" name="Attack Bike Flanking Section"><categoryLinks><categoryLink name="Mounted"/></categoryLinks><costs><cost name="pts" value="95"/></costs><profiles><profile typeName="Ability"><characteristics><characteristic name="Description">Wargear / legal alternatives: Exactly TWO attack bikes. Twin boltguns and heavy bolter per bike.</characteristic></characteristics></profile></profiles><profiles><profile typeName="Unit"><characteristics><characteristic name="W">5</characteristic></characteristics></profile></profiles></selectionEntry>
      <selectionEntry type="unit" id="cohort" name="Lost Cohort — Power Armour"><selectionEntryGroups><selectionEntryGroup name="Required unit size and formation" defaultSelectionEntryId="cohort5"><selectionEntries><selectionEntry id="cohort5" name="10 afflicted + attached Infernal Chaplain (foot)" type="upgrade"><costs><cost name="pts" value="365"/></costs></selectionEntry></selectionEntries></selectionEntryGroup></selectionEntryGroups></selectionEntry>
      </selectionEntries><sharedProfiles><profile id="hellblade" name="Hellblade" typeName="Weapon"><characteristics><characteristic name="Range">Melee</characteristic><characteristic name="A">3</characteristic><characteristic name="BS/WS">3+</characteristic><characteristic name="S">5</characteristic><characteristic name="AP">-1</characteristic><characteristic name="D">2</characteristic></characteristics></profile></sharedProfiles></catalogue>'''
    extra=page.evaluate('xml => GaulCatalogue.parseCatalogue(xml,"IW","source-sha").units',extras)
    letter=next(x for x in extra if x['name']=='Bloodletters')
    assert letter['models']==10 and letter['points']==125 and letter['special']=={'daemon':True},letter
    assert letter['loadout'][0]['count']==10,letter['loadout']
    bike=next(x for x in extra if x['name']=='Attack Bike Flanking Section')
    assert bike['models']==2 and bike['points']==95 and bike['special']=={'fnp':5,'regen':1,'painSensitive':True},bike
    lost=next(x for x in extra if x['name'].startswith('Lost Cohort'))
    assert lost['models']==10 and lost['points']==365 and lost['special'].get('mandatoryChaplain') is True,lost
    print('UNUSUAL COMPOSITIONS OK: 2 attack bikes, 10 daemons without serum, 10 Lost Cohort afflicted')
    browser.close()
