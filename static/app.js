const { createApp } = Vue
const LOCALE_FR = 'fr-FR'

createApp({
    data() {
	return {
	    // params for next programmed recording
	    prog: {
		chan: 0,
		date: (new Date()).toLocaleDateString('en-CA'),
		hour: 21,
		min: 0,
		title: '',
		duration: 100,
	    },

	    channels: [
		// table of objects with fields:
		// num --> int (unique)
		// name --> string
		// {num: 2, name: 'F2'},
	    ],

	    epg: [
		// table of objects with fields:
		// title --> string
		// date --> int (tstamp)
		// duration --> int (seconds)
		// {
		//     date: 1670184600,
		//     duration: 6600,
		//     title: "Jalouse"
		// },
	    ],

	    recordings: [
		// table of objects with fields:
		// id --> int (unique)
		// channel --> string
		// date --> string
		// start --> string
		// duration_min --> int
		// title --> string
		// {id: 42, channel: 'A', date: '2022-12-24',
		//  start: '20h45', duration_min: 95, title: 'merry xmas'},
	    ],
	}
    },

    computed: {
	prog_end_time() {
	    dt = this.prog_start_dt()
	    end = new Date(dt.valueOf() + this.prog.duration * 60 * 1000);
	    return end.toLocaleTimeString(LOCALE_FR)
	},
    },

    methods: {
	range(n) {
	    return Array.from ( {length: n}, (value, key) => key)
	},

	dt_from_date_hour_min(date, hour, min) {
	    dt = new Date(date)
	    dt.setHours(hour)
	    dt.setMinutes(min)
	    return dt
	},

	tstamp_from_dt(dt) {
	    return dt.valueOf() / 1000 // ms to secs. since Epoch
	},

	dt_from_tstamp(tstamp) {
	    return new Date(tstamp * 1000); // seconds to ms since Epoch
	},

	prog_start_dt() {
	    return this.dt_from_date_hour_min(this.prog.date,
					      this.prog.hour,
					      this.prog.min)
	},

	prog_start_tstamp() {
	    return this.tstamp_from_dt(this.prog_start_dt())
	},

	async fetchChannels() {
	    const resp = await fetch('/channels');
	    this.channels = await resp.json()
	    this.prog.chan = this.channels[0].num

	    this.fetchEpg(this.prog.chan, this.prog_start_tstamp())
	},

	fixupEpg(epg) {
	    epg.forEach(e => {
		e.start = this.dt_from_tstamp(e.date)
		    .toLocaleTimeString(LOCALE_FR)
		e.end = this.dt_from_tstamp(e.date + e.duration)
		    .toLocaleTimeString(LOCALE_FR)
	    })
	},

	selectEpg(e) {
	    if (this.prog.chan === 7) {
		mins_before = 2
		mins_after = 8
	    } else {
		mins_before = 7
		mins_after = 13
	    }
	    dt = this.dt_from_tstamp(e.date - 60 * mins_before)
	    this.prog.date = dt.toLocaleDateString('en-CA')
	    this.prog.hour = dt.getHours()
	    this.prog.min = dt.getMinutes()
	    this.prog.duration = Math.ceil(e.duration / 60)
		+ mins_before + mins_after
	    this.prog.title = e.title
	},

	async fetchEpg(chan, tstamp) {
	    fetch('/epg', {
		method: 'POST',
		body: JSON.stringify({
		    "num": chan,
		    "tstamp": tstamp,
		})
	    }).then((resp) => {
		if (!resp.ok) {
		    console.error('Could not fetch EPG')
		    this.epg = []
		} else {
		    resp.json().then(epg => {
			this.fixupEpg(epg)
			this.epg = epg
		    })
		}
	    })
	},

	async fetchRecordings() {
	    const resp = await fetch('/recordings');
	    recs = await resp.json()

	    recs.forEach(rec => {
		dt = this.dt_from_tstamp(rec.tstamp);
		rec.date = dt.toLocaleDateString(LOCALE_FR);
		rec.start = dt.toLocaleTimeString(LOCALE_FR);
		end = this.dt_from_tstamp(rec.tstamp + rec.duration_min * 60);
		rec.end = end.toLocaleTimeString(LOCALE_FR);
	    })

	    this.recordings = recs
	},

	async postRecording() {
	    fetch('/program', {
		method: 'POST',
		body: JSON.stringify({
		    "num": this.prog.chan,
		    "tstamp": this.prog_start_tstamp(),
		    "duration": this.prog.duration,
		    "title": this.prog.title,
		})
	    }).then((resp) => {
		if (!resp.ok) {
		    alert(`Impossible de programmer l'enregistrement`)
		} else {
		    this.fetchRecordings()
		}
	    })
	},

	async postCancel(job_id, title) {
	    if (confirm(`Annuler #${job_id} "${title}" ?`)) {
		console.log(`cancelling job #${job_id}`)
	    } else {
		console.log(`NOT cancelling job #${job_id}`)
		return
	    }

	    fetch('/cancel', {
		method: 'POST',
		body: JSON.stringify({ id: job_id })
	    }).then((resp) => {
		if (!resp.ok) {
		    alert(`Impossible d'annuler l'enregistrement #${job_id}`)
		} else {
		    this.fetchRecordings()
		}
	    })
	},
    },

    watch: {
	'prog.chan'(newChan) {
	    this.fetchEpg(newChan, this.prog_start_tstamp())
	    this.prog.title = ''
	},
	'prog.date'(newDate) {
	    dt = this.dt_from_date_hour_min(newDate,
					    this.prog.hour,
					    this.prog.min)
	    this.fetchEpg(this.prog.chan, this.tstamp_from_dt(dt))
	},
	'prog.hour'(newHour) {
	    dt = this.dt_from_date_hour_min(this.prog.date,
					    newHour,
					    this.prog.min)
	    this.fetchEpg(this.prog.chan, this.tstamp_from_dt(dt))
	},
    },

    mounted() {
	this.fetchChannels()
	this.fetchRecordings()
    },
}).mount('#app')
