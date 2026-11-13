"""Real Chromium release checks using the complete, checksum-pinned source XML.

External source responses are deterministic fixtures; application scripts, DOM,
storage, clicks, downloads and import/export run unchanged in a real browser.
"""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, unquote
import hashlib
import json
import os
import shutil
import sys
import threading
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1] if len(sys.argv) > 1 else root / 'upstream')
out = root / 'verification-artifacts'
out.mkdir(exist_ok=True)
files = ['Infernal_Warriors.cat', 'Frozen_Cogs.cat', 'Abandoned_Dead.cat', 'Silver_Tempest.cat']
xml = {name: (source / name).read_bytes() for name in files}
shas = {name: hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() for name, data in xml.items()}
tree = {'tree': [{'path': name, 'type': 'blob', 'sha': sha} for name, sha in shas.items()]}
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('BROWSER_EXECUTABLE') or shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, reduced_motion='reduce')
    errors = []
    reads = []
    mode = {'offline': False}

    def respond(route):
        request_url = route.request.url
        if mode['offline']:
            route.abort('internetdisconnected')
        elif '/git/trees/' in request_url:
            route.fulfill(json=tree)
        else:
            name = unquote(urlparse(request_url).path.rsplit('/', 1)[-1])
            if name in xml:
                reads.append(name)
                route.fulfill(body=xml[name], content_type='application/xml')
            else:
                route.abort()

    context.route('https://api.github.com/**', respond)
    context.route('https://raw.githubusercontent.com/**', respond)
    page = context.new_page()
    page.set_default_timeout(30000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url)
    page.locator('[data-tab="builder"]').click()
    expect(page.locator('#catalogue-sync-status')).to_contain_text('connection current', timeout=120000)
    expect(page.locator('#verification-counts')).to_contain_text('326 Synced')
    assert sorted(reads) == sorted(files), reads
    cache_bytes = page.evaluate('localStorage.getItem(GaulCatalogue.CACHE_KEY).length*2')
    assert cache_bytes < 5 * 1024 * 1024, cache_bytes
    for faction, count in [('IW', 96), ('FC', 169), ('AD', 61), ('ST', 8)]:
        page.locator('#faction-filter').select_option(faction)
        assert page.locator('[data-add]').count() == count, (faction, page.locator('#catalogue-count').inner_text())
    page.locator('#faction-filter').select_option('IW')
    while page.locator('[data-remove-side="player"]').count():
        page.locator('[data-remove-side="player"]').first.click()

    def add(name):
        page.locator('#unit-search').fill(name)
        cards = page.locator('.unit-card').filter(has=page.locator('h4', has_text=name))
        cards.locator('[data-add]').first.click()

    add('Rhino Carrier')
    page.locator('[data-edit-side="player"]').click()
    pintle = page.locator('select[data-config-slot]')
    expect(pintle).to_have_value('__none__')
    extra = pintle.locator('option').nth(1).get_attribute('value')
    pintle.select_option(extra)
    page.locator('#apply-musters').click()
    page.locator('#save-game').click()
    rhino = page.evaluate('()=>{const g=JSON.parse(localStorage.getItem("gaul-campaign-sim-v2")).game;return GaulEngine.BY_ID[g.units[0].template]}')
    assert sum(w['count'] for w in rhino['loadout'] if w['mode'] == 'ranged') == 2, rhino['loadout']
    page.locator('[data-tab="builder"]').click()
    page.locator('[data-remove-side="player"]').click()
    add('Dreadclaw Drop Pod')
    add('Despoiler Cadre')
    add('Despoiler Cadre')
    page.locator('[data-deploy-side="player"][data-deploy-index="0"]').select_option('deepstrike')
    page.locator('[data-deploy-side="player"][data-deploy-index="1"]').select_option('embark:0')
    page.locator('[data-deploy-side="player"][data-deploy-index="2"]').select_option('embark:0')
    expect(page.locator('#apply-musters')).to_be_enabled()
    page.screenshot(path=str(out / 'desktop-builder.png'), full_page=True)
    page.locator('#apply-musters').click()
    page.locator('#save-game').click()
    page.locator('#load-game').click()
    expect(page.locator('#battle-feedback')).to_have_text('Battle restored.')
    expect(page.locator('[data-deploy-reserve]')).to_be_disabled()
    # Skip the first turn using actual controls; the opponent plays automatically.
    for _ in range(5):
        page.locator('#next-phase').click()
    expect(page.locator('#scoreboard')).to_contain_text('BATTLE ROUND 2')
    page.locator('#next-phase').click()
    expect(page.locator('#scoreboard')).to_contain_text('Reinforcements')
    page.locator('[data-deploy-reserve]').click()
    page.locator('.cell.reachable').first.click()
    expect(page.locator('#battle-feedback')).to_have_text('Reserve unit arrived.')
    for _ in range(2):
        page.locator('[data-disembark]').first.click()
        page.locator('.cell.reachable').first.click()
        expect(page.locator('#battle-feedback')).to_have_text('Passengers disembarked.')
    page.locator('#save-game').click()
    saved = page.evaluate('JSON.parse(localStorage.getItem("gaul-campaign-sim-v2"))')
    assert all(u['deployment'] == 'field' for u in saved['game']['units'] if u['side'] == 'player')
    assert all(u.get('noChargeTurn') == '2-player' for u in saved['game']['units'] if u['uid'] in ['p1', 'p2'])
    with page.expect_download() as downloaded:
        page.locator('#export-game').click()
    path = out / 'browser-battle.json'
    downloaded.value.save_as(path)
    page.locator('#import-file').set_input_files(path)
    expect(page.locator('#battle-feedback')).to_have_text('Battle restored.')
    page.screenshot(path=str(out / 'desktop-arrival.png'), full_page=True)
    page.locator('#auto-finish').click()
    expect(page.locator('#scoreboard')).to_contain_text('Concluded')
    expect(page.locator('#next-phase')).to_be_disabled()
    page.locator('[data-tab="lab"]').click()
    page.locator('#run-lab').click()
    expect(page.locator('.results-table tbody tr')).to_have_count(10)
    first_results = page.locator('.results-table tbody').inner_text()
    page.locator('#run-lab').click()
    assert page.locator('.results-table tbody').inner_text() == first_results
    # Source unchanged: refresh does not download every XML again.
    page.locator('[data-tab="builder"]').click()
    page.reload()
    page.locator('[data-tab="builder"]').click()
    expect(page.locator('#catalogue-sync-status')).to_contain_text('connection current', timeout=60000)
    assert len(reads) == 4, reads
    mode['offline'] = True
    page.reload()
    page.locator('[data-tab="builder"]').click()
    expect(page.locator('#catalogue-sync-status')).to_contain_text('source check incomplete')
    expect(page.locator('#verification-counts')).to_contain_text('326 Synced')
    # Mobile layout and controls, backed by the same actual cached catalogues.
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Mobile page overflow'
    page.locator('#faction-filter').select_option('IW')
    page.locator('#unit-search').fill('Land Raider')
    expect(page.locator('#unit-catalogue')).to_contain_text('Land Raider')
    page.screenshot(path=str(out / 'mobile-builder.png'), full_page=True)
    page.locator('[data-tab="battle"]').click()
    page.locator('#load-game').click()
    expect(page.locator('#battle-feedback')).to_have_text('Battle restored.')
    page.screenshot(path=str(out / 'mobile-battle.png'), full_page=True)
    assert not errors, errors
    report = {'passed': True, 'browser': browser.version, 'imported': 326, 'cacheBytes': cache_bytes,
              'sourceDownloads': len(reads), 'javascriptErrors': errors,
              'checks': ['fresh XML sync and checksums', 'all faction lists', 'optional vehicle equipment',
                         'Deep Strike with two purchased passenger squads', 'reinforcement timing',
                         'arrival disembarkation', 'save/load and export/import', 'complete battle',
                         'reproducible ten-game Battle Lab', 'unchanged revision cache',
                         'offline cached startup', '390px mobile controls and overflow']}
    (out / 'browser-qc.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    browser.close()
server.shutdown()
