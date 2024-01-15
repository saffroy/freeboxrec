import datetime
import flask
import json
import os
import re
import unidecode
import werkzeug.exceptions

import at
import freebox

OUT_DIR = os.environ.get('FREEBOXREC_OUTDIR', '/tmp')
SCRIPT_PATH = os.path.join(os.getcwd(), 'job.sh')
EPG_KEYS = { 'date', 'duration', 'title' }

CHANNEL_TABLE = freebox.fetch_channel_table()

app = flask.Flask('freeboxrec')

@app.route('/')
def root():
    return app.send_static_file("index.html")

@app.route('/channels')
def channels():
    j = [ { 'num': num, 'name': name }
          for (num, name) in CHANNEL_TABLE.name_table() ]
    return flask.json.jsonify(j)

@app.route('/epg', methods=['POST'])
def epg():
    try:
        body = flask.request.get_json(force=True)

        num = int(body['num'])
        tstamp = int(body['tstamp'])

        uuid = CHANNEL_TABLE.uuid(num)
        dt = datetime.datetime.fromtimestamp(tstamp)

    except Exception as e:
        raise werkzeug.exceptions.BadRequest(
            'Error: invalid request body: {}'.format(repr(e)))

    epg = freebox.fetch_epg(uuid, int(dt.timestamp()))
    j = [
        dict((k,v)
             for (k,v) in d.items()
             if k in EPG_KEYS)
        for d in epg
    ]
    return flask.json.jsonify(j)

@app.route('/recordings')
def recordings():
    jobs = at.list_jobs()
    recs = []
    for (i, d, running) in jobs:
        desc = json.loads(d)
        desc['id'] = i
        desc['running'] = running
        recs.append(desc)
    return flask.json.jsonify(recs)

def friendly_name(s):
    return unidecode.unidecode(re.sub("[ \t'\",;/]", '_', s))

def schedule_rec(stream, tstamp, duration_sec, outfile, desc):
    env = dict()
    env['FREEBOXREC_STREAM'] = stream
    env['FREEBOXREC_DURATION'] = str(duration_sec)
    env['FREEBOXREC_OUTFILE'] = outfile
    at.schedule_job(tstamp, SCRIPT_PATH, env, desc)

@app.route('/program', methods=['POST'])
def program():
    try:
        body = flask.request.get_json(force=True)

        num = int(body['num'])
        stream = CHANNEL_TABLE.stream(num)
        channel = CHANNEL_TABLE.name(num)

        tstamp = int(body['tstamp'])
        duration_min = int(body['duration'])
        title = body['title']

    except Exception as e:
        raise werkzeug.exceptions.BadRequest(
            'Error: invalid request body: {}'.format(repr(e)))

    outfile = '{title}-[{duration}]'.format(
        title=title,
        duration=duration_min,
    )
    desc = json.dumps(dict(
        channel=channel,
        tstamp=tstamp,
        duration_min=duration_min,
        title=title,
    ))

    schedule_rec(stream, tstamp, duration_min*60,
                 os.path.join(OUT_DIR, friendly_name(outfile)),
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
