"""Audit live New Recruit XML structure (run in CI after checkout of source repo)."""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

source = Path(sys.argv[1] if len(sys.argv)>1 else 'upstream')
manifest = json.loads((source / 'catalogue-manifest.json').read_text())
expected = {entry['file']:entry['root_units'] for entry in manifest['files'] if entry['file'].endswith('.cat')}


def child(node, name):
    return [x for x in list(node) if x.tag.rsplit('}',1)[-1]==name]


def first(node, name):
    return next(iter(child(node,name)),None)


def candidates(root):
    all_entries={x.get('id'):x for x in root.iter() if x.tag.rsplit('}',1)[-1]=='selectionEntry' and x.get('id')}
    found={}
    def add(node):
        if node is not None and node.get('type')=='unit' and node.get('hidden')!='true':found[node.get('id')]=node
    def walk(group):
        for c in child(group,'selectionEntries'):
            for entry in child(c,'selectionEntry'):add(entry)
        for c in child(group,'entryLinks'):
            for ref in child(c,'entryLink'):add(all_entries.get(ref.get('targetId')))
        for c in child(group,'selectionEntryGroups'):
            for sub in child(c,'selectionEntryGroup'):walk(sub)
    walk(root)
    if not found:
        for c in child(root,'sharedSelectionEntries'):
            for entry in child(c,'selectionEntry'):add(entry)
    return found


def main():
    failures=0
    for name,wanted in expected.items():
        root=ET.parse(source/name).getroot()
        units=candidates(root)
        sample=[(u.get('id'),u.get('name')) for u in list(units.values())[:8]]
        print(f'{name}: {len(units)} selectable root units; manifest {wanted}; revision {root.get("revision")}; sample {sample}')
        if wanted and len(units)<wanted*.80:
            print('ERROR: root parser would expose fewer than 80% of declared units')
            failures+=1
    sys.exit(1 if failures else 0)

if __name__=='__main__':main()
