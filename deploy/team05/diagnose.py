"""Read only deployment diagnostics; never print pod environment or Secret values."""
import json,subprocess
def read(resource,*args):
    result=subprocess.run(['kubectl','--namespace=team05','--request-timeout=20s','get',resource,*args,'-o','json'],capture_output=True,text=True)
    if result.returncode:print(result.stderr[:1200],flush=True);return []
    return json.loads(result.stdout).get('items',[])
for item in read('pods','-l','app.kubernetes.io/part-of=attest'):
    status=item.get('status',{})
    print(json.dumps({'pod':item['metadata']['name'],'phase':status.get('phase'),'conditions':status.get('conditions'),'containers':[{'name':c['name'],'state':c.get('state'),'restarts':c.get('restartCount')} for c in status.get('initContainerStatuses',[])+status.get('containerStatuses',[])]}),flush=True)
for item in read('pvc'):
    print(json.dumps({'pvc':item['metadata']['name'],'spec':item.get('spec'),'status':item.get('status')}),flush=True)
for item in read('events'):
    if item.get('type')=='Warning' or item.get('reason') in ['FailedBinding','ProvisioningFailed','FailedScheduling']:
        print(json.dumps({'event':item.get('reason'),'object':item.get('involvedObject',{}).get('name'),'message':item.get('message','')[:1400]}),flush=True)
