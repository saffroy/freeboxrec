import base64
import datetime
import os
import re
import subprocess

def list_all_at_jobs():
    r = subprocess.run(['atq'], capture_output=True)

    s = r.stdout.decode()
    m = re.findall(r'(^|\n)([0-9]+).*\s([a-zA-Z=])\s', s)
    ids = [ (int(i), q == '=') for (_, i, q) in m ]
    return ids

def list_jobs():
    # check each job id for our own descriptor
    jobs = list_all_at_jobs()

    descs = []
    for i, running in jobs:
        cmd = f'at -c {i}'
        r = subprocess.run(cmd.split(), capture_output=True)
        m = re.search(b'FREEBOXREC_DESC=([0-9a-zA-Z\+/=]+)', r.stdout)
        if m:
            desc = base64.b64decode(m.group(1)).decode()
            descs.append((i, desc, running))

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

    # there may be other jobs already scheduled on this system
    jobs = list_jobs()
    print('jobs:', jobs)
    ids = [i for (i, _, _) in jobs]

    # create one job
    with tempfile.NamedTemporaryFile() as f:
        schedule_job(datetime.datetime.now().timestamp() + 100,
                     f.name, None, 'Hello, world!')

    # load updated job list
    new_jobs = list_jobs()
    print('jobs:', new_jobs)
    new_ids = [i for (i, _, _) in new_jobs
               if i not in ids]

    # check: exactly one job added
    [i] = new_ids

    # cancel test job
    cancel_job(i)
    print('jobs:', list_jobs())
