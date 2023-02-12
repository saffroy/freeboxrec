import base64
import datetime
import os
import re
import subprocess

def list_all_at_jobs():
    r = subprocess.run(['atq'], capture_output=True)

    s = r.stdout.decode()
    m = re.findall('(^|\n)([0-9]+)', s)
    ids = [ int(i) for (_,i) in m ]
    return ids

def list_jobs():
    # check each job id for our own descriptor
    ids = list_all_at_jobs()

    descs = []
    for i in ids:
        cmd = f'at -c {i}'
        r = subprocess.run(cmd.split(), capture_output=True)
        m = re.search(b'FREEBOXREC_DESC=([0-9a-zA-Z\+/=]+)', r.stdout)
        if m:
            desc = base64.b64decode(m.group(1)).decode()
            descs.append((i, desc))

    return descs

def schedule_job(tstamp, script, extra_env=None, desc=''):
    env = os.environ.copy()
    env['FREEBOXREC_DESC'] = base64.b64encode(desc.encode())
    if extra_env:
        env.update(extra_env)

    now = datetime.datetime.now()
    then = datetime.datetime.fromtimestamp(tstamp)
    delta = then - now
    minutes = max(0, int(delta.total_seconds() / 60))

    cmd = f'at -f {script} now + {minutes} minutes'
    subprocess.run(cmd.split(), env=env)

def cancel_job(i):
    cmd = f'atrm {i}'
    subprocess.run(cmd.split())

def smoke_test():
    import tempfile
    
    print('jobs:', list_jobs())
    with tempfile.NamedTemporaryFile() as f:
        schedule_job(datetime.datetime.now().timestamp() + 100,
                     f.name, None, 'Hello, world!')
    print('jobs:', list_jobs())
    [(i, _)] = list_jobs()
    cancel_job(i)
    print('jobs:', list_jobs())
