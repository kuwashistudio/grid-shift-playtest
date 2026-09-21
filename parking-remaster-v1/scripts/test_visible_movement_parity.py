import json, pathlib, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
FIX=ROOT/'qa/visible_movement_parity_fixture_v1.json'
data=json.loads(FIX.read_text())
assert data['activation_guard']['current_authorization'] is False
assert len(data['cases'])>=8

def overlap(a0,a1,b0,b1): return a0<=b1 and b0<=a1
def legal(c):
 v=c['vehicle']; e=c['exit']
 for b in c['blockers']:
  if v['axis']=='+x' and overlap(v['y'],v['y']+v['h'],b['y'],b['y']+b['h']) and b['x']<=e and b['x']+b['w']>=v['x']+v['w']: return False
  if v['axis']=='-x' and overlap(v['y'],v['y']+v['h'],b['y'],b['y']+b['h']) and b['x']+b['w']>=e and b['x']<=v['x']: return False
  if v['axis']=='+y' and overlap(v['x'],v['x']+v['w'],b['x'],b['x']+b['w']) and b['y']<=e and b['y']+b['h']>=v['y']+v['h']: return False
  if v['axis']=='-y' and overlap(v['x'],v['x']+v['w'],b['x'],b['x']+b['w']) and b['y']+b['h']>=e and b['y']<=v['y']: return False
 return True
py={c['id']:legal(c) for c in data['cases']}
expected={c['id']:c['expected'] for c in data['cases']}
assert py==expected,(py,expected)
js=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/check_visible_movement_parity.js'),str(FIX)],text=True))
assert js==expected,(js,expected)
assert js==py
print(f'PASS: {len(expected)} bounded visible-movement cases agree in Python and JS; authorization remains false')
