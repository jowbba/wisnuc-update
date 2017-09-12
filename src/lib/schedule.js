var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var updateCreater = require('./updateTask')

class Schedule {
	constructor() {
		this.configPath = path.join(process.cwd(), 'config.json')
		this.cachedirPath = path.join(process.cwd(), 'cache')
		this.tempdirPath = path.join(process.cwd(), 'temp')
		this.tasks = []
		this.working = []
		this.finish = []
		this.config = {}
		this.lock = false
	}

	init() {
		//remove temp folder & create temp/cache directory
		rimraf(this.tempdirPath, () => {
			mkdirp(this.tempdirPath)
			mkdirp(this.cachedirPath)
		})
		

		try{
			//read config
			let result = fs.readFileSync(this.configPath, {encoding: 'utf-8'})
			this.config = JSON.parse(result)
		}catch(e) {
			//config not exist & create config
			fs.writeFile(this.configPath, JSON.stringify({version: 0}), (err,  data) => {
				if (err) {
					console.log(err)
					throw new Error('init failed')
				}else {
					console.log('create config success')
					this.config = {version: 0}
				}
			})
		}
	}

	addEvent(event) {
		//add new task & schedule
		this.tasks.push(updateCreater(this, event))
		this.schedule()
	}

	schedule() {
		//if a task is running, waiting
		if (this.lock) return
		//else run task in readylist
		if (this.tasks.length) {
			console.log('enter schedule')
			this.lock = true
			this.working.push(this.tasks.splice(0, 1)[0])
			this.working[0].beginUpdate()
		}
	}
}

module.exports = new Schedule()