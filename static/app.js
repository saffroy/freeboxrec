const { createApp } = Vue

createApp({
    data() {
	return {
	    // params for next programmed recording
	    prog: {
		chan: 0,
		date: (new Date()).toLocaleDateString(),
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
	    return end.toLocaleTimeString()
	},
    },

    methods: {
	range(n) {
	    return Array.from ( {length: n}, (value, key) => key)
	},

	prog_start_dt() {
	    dt = new Date(this.prog.date)
	    dt.setHours(this.prog.hour)
	    dt.setMinutes(this.prog.min)
	    return dt
	},

	async fetchChannels() {
	    const resp = await fetch('/channels');
	    this.channels = await resp.json()
	    this.prog.chan = this.channels[0].num
	},

	async fetchRecordings() {
	    const resp = await fetch('/recordings');
	    recs = await resp.json()

	    recs.forEach(rec => {
		dt = new Date(rec.tstamp * 1000); // seconds to ms since Epoch
		rec.date = dt.toLocaleDateString();
		rec.start = dt.toLocaleTimeString();
		end = new Date(dt.valueOf() + rec.duration_min * 60 * 1000);
		rec.end = end.toLocaleTimeString();
	    })

	    this.recordings = recs
	},

	async postRecording() {
	    dt = this.prog_start_dt()
	    tstamp = dt.valueOf() / 1000 // ms to secs. since Epoch

	    fetch('/program', {
		method: 'POST',
		body: JSON.stringify({
		    "num": this.prog.chan,
		    "tstamp": tstamp,
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

    mounted() {
	this.fetchChannels()
	this.fetchRecordings()
    },
}).mount('#app')
