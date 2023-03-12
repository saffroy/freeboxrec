"use strict";

const { createApp } = Vue
const LOCALE_FR = 'fr-FR'
const DATE_PICKER_LOCALE = 'fr-CA'
const DATE_OPTIONS_SHORT = {
    weekday: "short",
    day: "numeric",
    month: "short",
}

function date_today() {
    return (new Date()).toLocaleDateString(DATE_PICKER_LOCALE)
}

const myApp = createApp({
    data() {
	return {
	    // params for next programmed recording
	    prog: {
		chan: 0,
		chan_idx: -1,
		date: date_today(),
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
		// channel --> string
		// date --> string
		// duration_min --> int
		// id --> int (unique)
		// title --> string
		// tstamp --> int (tstamp)
		// { "channel": "Arte", "duration_min": 130, "id": 740,
		// "title": "Starship Troopers", "tstamp": 1676231580,
		// "date": "dim. 12 févr." }
	    ],
	}
    },

    computed: {
	prog_end_dt() {
	    const dt = this.prog_start_dt()
	    const end = new Date(dt.valueOf() + this.prog.duration * 60 * 1000)
	    return end
	},

	prog_end_time() {
	    return this.time_from_dt(this.prog_end_dt)
	},

	channel_name() {
	    if (this.prog.chan_idx < 0) {
		return "<...>"
	    } else {
                const chan = this.channels[this.prog.chan_idx]
		return `${chan.num} - ${chan.name}`
            }
	},
    },

    methods: {
	range(n) {
	    return Array.from ( {length: n}, (value, key) => key)
	},

	compareNumbers(a, b) {
	    return (a > b) ? 1
		: ((a < b) ? -1
		   : 0)
	},

	chan_update(adj) {
	    const new_idx = this.prog.chan_idx + adj
	    if ((new_idx >= 0) && (new_idx < this.channels.length))
		this.prog.chan_idx = new_idx
	},

	dt_from_date_hour_min(date, hour, min) {
	    const dt = new Date(date)
	    dt.setHours(hour)
	    dt.setMinutes(min)
	    return dt
	},

	tstamp_from_dt(dt) {
	    return dt.valueOf() / 1000 // ms to secs. since Epoch
	},

	time_from_dt(dt) {
	    return dt.toLocaleTimeString(LOCALE_FR, { timeStyle: "short" })
	},

	dt_from_tstamp(tstamp) {
	    return new Date(tstamp * 1000) // seconds to ms since Epoch
	},

	time_start_end(tstamp, duration_sec) {
	    const start_time = this.time_from_dt(this.dt_from_tstamp(tstamp))
	    const end_time   = this.time_from_dt(this.dt_from_tstamp(tstamp + duration_sec))
	    const minutes = Math.ceil(duration_sec / 60)
	    return `${start_time} - ${end_time} (${minutes} min.)`
	},

	prog_start_dt() {
	    return this.dt_from_date_hour_min(this.prog.date,
					      this.prog.hour,
					      this.prog.min)
	},

	prog_start_tstamp() {
	    return this.tstamp_from_dt(this.prog_start_dt())
	},

	update_day_time(dt) {
	    this.prog.date = dt.toLocaleDateString(DATE_PICKER_LOCALE)
	    this.prog.hour = dt.getHours()
	    this.prog.min = dt.getMinutes()
	},

	date_add(days) {
	    const one_day_ms = 24*60*60*1000
	    const dt = new Date(this.prog_start_dt().valueOf() + days * one_day_ms)
	    this.update_day_time(dt)
	},

	time_add(hours) {
	    const one_hour_ms = 60*60*1000
	    const dt = new Date(this.prog_start_dt().valueOf() + hours * one_hour_ms)
	    this.update_day_time(dt)
	},

	reset_day_time() {
	    const dt = this.dt_from_date_hour_min(date_today(), 21, 0)
	    this.update_day_time(dt)
	},

        fetch(resource, options) {
            return fetch(resource, options)
                .then((resp) => {
                    if (!resp.ok) {
                        console.error(`HTTP error fetching ${resource}`, resp)
                        throw new Error(`HTTP error status: ${resp.status}`)
                    }
                    return resp
                })
        },

	async fetchChannels() {
            try {
	        const resp = await this.fetch('channels')
	        this.channels = await resp.json()
	        this.prog.chan_idx = 0
            } catch(error) {
                console.error(`Error fetching /channels: ${error}`)
                alert('Impossible de charger la liste des chaînes.')
            }
	},

	selectEpg(e) {
	    const chan_on_time = (this.prog.chan === 7)
	    const mins_before = chan_on_time ? 2 : 7
	    const mins_after = chan_on_time ? 8 : 13
	    const dt = this.dt_from_tstamp(e.date - 60 * mins_before)

	    this.update_day_time(dt)
	    this.prog.duration =
		Math.ceil(e.duration / 60) + mins_before + mins_after
	    this.prog.title = e.title
	},

	async fetchEpg(chan, tstamp) {
            try {
	        const resp = await this.fetch('epg', {
		    method: 'POST',
		    body: JSON.stringify({
		        "num": chan,
		        "tstamp": tstamp,
		    })
	        })
                const epg = await resp.json()

                epg.sort((a, b) => this.compareNumbers(a.date, b.date))
		this.epg = epg
            } catch (error) {
                console.error(`Error fetching /epg: ${error}`)
                alert('Impossible de charger la liste des programmes.')
		this.epg = []
	    }
	},

	async fetchRecordings() {
            try {
	        const resp = await this.fetch('recordings')
	        const recs = await resp.json()

	        recs.forEach(rec => {
		    const dt = this.dt_from_tstamp(rec.tstamp)
		    rec.date = dt.toLocaleDateString(LOCALE_FR, DATE_OPTIONS_SHORT)
	        })

	        recs.sort((a, b) => this.compareNumbers(a.tstamp, b.tstamp))

	        this.recordings = recs
            } catch (error) {
                console.error(`Error fetching /recordings: ${error}`)
                alert('Impossible de charger la liste des enregistrements.')
            }
	},

	async postRecording() {
	    if (this.prog.title === "") {
		alert("Le champ Titre ne peut être vide.")
		return
	    }
	    if (this.prog_end_dt <= (new Date())) {
		alert("Le programme est terminé.")
		return
	    }

            try {
	        await this.fetch('program', {
		    method: 'POST',
		    body: JSON.stringify({
		        "num": this.prog.chan,
		        "tstamp": this.prog_start_tstamp(),
		        "duration": this.prog.duration,
		        "title": this.prog.title,
		    })
	        })
            } catch (error) {
                console.error(`Error fetching /program: ${error}`)
	        alert(`Impossible de programmer l'enregistrement.`)
            } finally {
		this.fetchRecordings()
	    }
	},

	async postCancel(job_id, title) {
	    if (!confirm(`Annuler "${title}" ?`))
		return

            try {
	        await this.fetch('cancel', {
		    method: 'POST',
		    body: JSON.stringify({ id: job_id })
	        })
            } catch (error) {
                console.error(`Error fetching /cancel: ${error}`)
		alert(`Impossible d'annuler l'enregistrement #${job_id} "${title}"`)
            } finally {
		this.fetchRecordings()
	    }
	},
    },

    watch: {
	'prog.chan'(newChan) {
	    this.prog.title = ''
	    this.fetchEpg(newChan, this.prog_start_tstamp())
	},
	'prog.date'(newDate) {
	    const dt = this.dt_from_date_hour_min(newDate,
						  this.prog.hour,
						  this.prog.min)
	    this.fetchEpg(this.prog.chan, this.tstamp_from_dt(dt))
	},
	'prog.hour'(newHour) {
	    const dt = this.dt_from_date_hour_min(this.prog.date,
						  newHour,
						  this.prog.min)
	    this.fetchEpg(this.prog.chan, this.tstamp_from_dt(dt))
	},
	'prog.chan_idx'(newIdx) {
	    this.prog.chan = this.channels[newIdx].num
	},
    },

    mounted() {
	this.fetchChannels()
	this.fetchRecordings()
    },
}).mount('#app')
