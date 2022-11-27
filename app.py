import datetime
import flask
import json
import re
import werkzeug.exceptions

import at
import freebox

OUT_DIR = '/backup/ext/tmp'
SCRIPT_PATH = '/home/saffroy/prog/python/freeboxrec/job.sh'

app = flask.Flask('freeboxrec')

@app.route('/')
def root():
    return app.send_static_file("index.html")

@app.route('/channels')
def channels():
    c = freebox.fetch_channel_table()
    j = [ { 'num': num, 'name': name }
          for (num, name) in c.name_table() ]
    return flask.json.jsonify(j)

@app.route('/recordings')
def recordings():
    jobs = at.list_jobs()
    recs = []
    for (i, d) in jobs:
        desc = json.loads(d)
        desc['id'] = i
        recs.append(desc)
    return flask.json.jsonify(recs)

def friendly_name(s):
    return re.sub("[ \t'\",;/]", '_', s)

def schedule_rec(stream, tstamp, duration_sec, outfile, desc):
    env = dict()
    env['FREEBOXREC_STREAM'] = stream
    env['FREEBOXREC_DURATION'] = str(duration_sec)
    env['FREEBOXREC_OUTFILE'] = outfile
    at.schedule_job(tstamp, SCRIPT_PATH, env, desc)

@app.route('/program', methods=['POST'])
def program():
    c = freebox.fetch_channel_table()

    try:
        body = flask.request.get_json(force=True)

        num = int(body['num'])
        stream = c.stream(num)
        channel = c.name(num)

        tstamp = int(body['tstamp'])
        duration_min = int(body['duration'])
        title = body['title']

        dt = datetime.datetime.fromtimestamp(tstamp)

    except Exception as e:
        raise werkzeug.exceptions.BadRequest(
            'Error: invalid request body: {}'.format(repr(e)))

    outfile = '[{channel}]-{date}-{time}-[{duration}]-{title}'.format(
        channel=channel,
        date=dt.date().isoformat(),
        time=str(dt.time()),
        duration=duration_min,
        title=title,
    )
    desc = json.dumps(dict(
        channel=channel,
        tstamp=tstamp,
        duration_min=duration_min,
        title=title,
    ))

    schedule_rec(stream, tstamp, duration_min*60,
                 OUT_DIR +'/' + friendly_name(outfile),
                 desc)
    return 'OK'

@app.route('/cancel', methods=['POST'])
def cancel():
    try:
        body = flask.request.get_json(force=True)
        job = int(body['id'])

    except Exception as e:
        raise werkzeug.exceptions.BadRequest(
            'Error: invalid job id in request body: {}'.format(repr(e)))

    at.cancel_job(job)
    return 'OK cancelled {}'.format(job)
