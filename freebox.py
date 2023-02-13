import urllib3
import json

API_BASE = 'http://mafreebox.freebox.fr/api/v8'
CHANNEL_PROP_URL  = API_BASE + '/tv/channels'
CHANNEL_TABLE_URL = API_BASE + '/tv/bouquets/freeboxtv/channels/'
CHANNEL_EPG_URL   = API_BASE + '/tv/epg/by_channel/{uuid}/{tstamp}'

HTTP = urllib3.PoolManager()

def fetch(url):
    r = HTTP.request('GET', url)
    assert(r.status == 200)
    data = json.loads(r.data)
    assert data['success'], 'Freebox API error: "{}"'.format(r.data)
    return data['result']

def fetch_channels():
    return fetch(CHANNEL_TABLE_URL)

def fetch_props():
    return fetch(CHANNEL_PROP_URL)

STREAM_QUALITY = ['hd', 'sd', 'ld'] # ordered from best to worst

def channel_filter(c):
    if (c['available'] and c['pub_service']
        and c['sub_number'] == 0):
        for s in c['streams']:
            if s['rtsp'] and s['quality'] in STREAM_QUALITY:
                return True
    return False

class Channels():
    def __init__(self, channels, props):
        self._channels = list(filter(channel_filter, channels))
        self._props = props
        self._by_num = dict((c['number'], c) for c in self._channels)

    def nums(self):
        return sorted(self._by_num.keys())
    def by_num(self, n):
        return self._by_num[n]
    def uuid(self, n):
        return self._by_num[n]['uuid']
    def name(self, n):
        k = self.uuid(n)
        return self._props[k]['name']
    def stream(self, n):
        streams = self._by_num[n]['streams']
        d = dict((s['quality'], s['rtsp']) for s in streams)
        for q in STREAM_QUALITY:
            if q in d:
                return d[q]
        assert False
        return ''
    def name_table(self):
        table = [ (n, self.name(n)) for n in self.nums() ]
        return table

def fetch_epg(uuid, tstamp):
    url = CHANNEL_EPG_URL.format(uuid=uuid, tstamp=tstamp)
    res = fetch(url)
    return list(res.values())

def fetch_channel_table():
    channels = fetch_channels()
    props = fetch_props()
    channel_table = Channels(channels, props)
    return channel_table

def smoke_test():
    channel_table = fetch_channel_table()
    l = [ (n, channel_table.name(n)) for n in channel_table.nums() ]
    print(l[:20])
