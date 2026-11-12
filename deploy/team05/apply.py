"""Roll out a pinned release; credentials arrive only through encrypted CI secrets."""
import base64,json,os,pathlib,subprocess,sys,time,urllib.request

repo=pathlib.Path(__file__).resolve().parents[2]
namespace='team05'
def kubectl(*args,body=None):
    timeout='0' if args[0] in ['rollout','wait','delete'] else '30s'
    for attempt in range(3):
        result=subprocess.run(['kubectl','--namespace',namespace,'--request-timeout='+timeout,*args],input=None if body is None else json.dumps(body),text=True,capture_output=True)
        transient=any(message in result.stderr for message in ['TLS handshake timeout','i/o timeout','connection reset','ServiceUnavailable'])
        if not result.returncode or not transient or attempt==2:break
        print('Retrying temporary Kubernetes connection failure',flush=True);time.sleep(2)
    if result.returncode:raise RuntimeError(result.stderr.strip()[:1800])
    return result.stdout
def current(kind,name):
    value=kubectl('get',kind,name,'--ignore-not-found','-o','json')
    return json.loads(value) if value.strip() else None
def bootstrap_pod_completed(job,pods):
    if job['spec'].get('completions',1)!=1:return False
    return any(pod.get('status',{}).get('phase')=='Succeeded' and any(owner.get('uid')==job['metadata']['uid'] and owner.get('controller') for owner in pod['metadata'].get('ownerReferences',[])) for pod in pods)
def apply(item):
    existing=current(item['kind'],item['metadata']['name'])
    if existing and existing['metadata'].get('labels',{}).get('app.kubernetes.io/managed-by')!='attest-team05':raise RuntimeError('Unmanaged resource: '+item['metadata']['name'])
    if existing and item['kind']=='PersistentVolumeClaim' and existing.get('status',{}).get('phase')=='Bound':
        if existing['spec']['accessModes']!=item['spec']['accessModes'] or existing['spec']['resources']['requests']['storage']!=item['spec']['resources']['requests']['storage']:raise RuntimeError('Existing bound claim requires explicit storage review: '+item['metadata']['name'])
        print('Preserved bound volume claim '+item['metadata']['name'],flush=True)
        return
    print(kubectl('apply','--server-side','--field-manager=attest-team05','-f','-',body=item).strip(),flush=True)

if kubectl('config','view','--minify','-o','jsonpath={.contexts[0].context.namespace}').strip()!=namespace:raise RuntimeError('Kubeconfig namespace mismatch')
bundle=json.loads(os.environ['TEAM05_BOOTSTRAP_JSON'])
for name,values in bundle.items():
    existing=current('secret',name)
    if existing:
        if existing['metadata'].get('labels',{}).get('app.kubernetes.io/managed-by')!='attest-team05':raise RuntimeError('Unmanaged secret: '+name)
        print('Preserved secret '+name,flush=True);continue
    apply({'apiVersion':'v1','kind':'Secret','metadata':{'name':name,'namespace':namespace,'labels':{'app.kubernetes.io/managed-by':'attest-team05','app.kubernetes.io/part-of':'attest'}},'type':'Opaque','data':{key:base64.b64encode(value.encode()).decode() for key,value in values.items()}})

commit=os.environ['GITHUB_SHA']
release=json.loads(subprocess.check_output(['gh','api','repos/Lideeyah/attest-team-terra/releases/tags/team05-'+commit],text=True))
configuration={'commit':commit}
for kind in ['frontend','backend']:
    asset=next(item for item in release['assets'] if item['name']==kind+'.tar.gz')
    configuration[kind.upper()+'_ASSET_URL']=asset['url']
    configuration[kind.upper()+'_SHA256']=asset['digest'].removeprefix('sha256:')
target=repo/'.release/team05.json';target.parent.mkdir(exist_ok=True);target.write_text(json.dumps(configuration))
items=json.loads(subprocess.check_output(['node','deploy/team05/render.mjs',str(target)],cwd=repo,text=True))['items']
for item in items:
    if item['kind']=='ConfigMap' or item['metadata']['name'] in ['postgres-data','postgres']:apply(item)
try:print(kubectl('rollout','status','deployment/postgres','--timeout=300s'),flush=True)
except RuntimeError:
    subprocess.run([sys.executable,'deploy/team05/diagnose.py'],cwd=repo)
    raise
job=next(item for item in items if item['kind']=='Job');name=job['metadata']['name']
if current('job',name) is None:apply(job)
try:
    deadline=time.monotonic()+600
    while time.monotonic()<deadline:
        observed=current('job',name);status=observed.get('status',{})
        if status.get('succeeded')==1:print('Bootstrap completed',flush=True);break
        if status.get('failed') or any(c.get('type')=='Failed' and c.get('status')=='True' for c in status.get('conditions',[])):raise RuntimeError('Bootstrap job failed')
        pods=json.loads(kubectl('get','pods','-l','job-name='+name,'-o','json')).get('items',[])
        if bootstrap_pod_completed(observed,pods):print('Bootstrap pod succeeded; Job controller status is delayed',flush=True);break
        time.sleep(5)
    else:raise RuntimeError('Bootstrap readiness timed out')
except RuntimeError:
    for container in ['fetch-runtime','bootstrap']:
        try:print(kubectl('logs','job/'+name,'-c',container,'--tail=40'),flush=True)
        except RuntimeError:print('Logs unavailable for '+container,flush=True)
    raise
if current('job',name).get('status',{}).get('succeeded')==1:print(kubectl('delete','job',name,'--wait=true','--timeout=90s'),flush=True)
else:print('Preserved completed bootstrap Job for controller tracking',flush=True)
for item in items:
    if item['metadata']['name'] in ['api','worker','frontend','app']:apply(item)
for name in ['api','worker','frontend']:
    try:print(kubectl('rollout','status','deployment/'+name,'--timeout=300s'),flush=True)
    except RuntimeError:
        print(kubectl('get','pods','-o','wide'),flush=True)
        print(kubectl('logs','deployment/'+name,'--all-containers=true','--tail=30'),flush=True);raise
service=current('service','app');assert service['spec']['ports'][0]['port']==80
print(kubectl('get','deployments,services,pvc'),flush=True)
print('Ready: https://team05.xtradot.co via Service app:80',flush=True)
