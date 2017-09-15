var promise = require('bluebird')
var fs = require('fs')
var path = require('path')
var mkdirp = promise.promisify(require('mkdirp'))
var rimraf = promise.promisify(require('rimraf'))
var updateCreater = require('./updateTask')

class Schedule {
	constructor() {
		this.configPath = path.join(process.cwd(), 'config.json')
		this.cachedirPath = path.join(process.cwd(), 'cache')
		this.tempdirPath = path.join(process.cwd(), 'temp')
		this.wisnucPath = path.join(process.cwd(), 'wisnuc')
		this.tasks = []
		this.working = []
		this.finish = []
		this.config = {}
		this.options = {}
		this.lock = false
	}

	async init() {
		//init options
		try {
			let options = fs.readFileSync(path.join(process.cwd(), 'options.js'))
			this.options = options
		}catch (e) {
			console.log(`get options error : ${e}`)
			throw e
		}

		//remove temp folder & create temp/cache directory
		try {
			await rimraf(this.tempdirPath)
			await mkdirp(this.tempdirPath)
			await mkdirp(this.cachedirPath)
		}catch(e) {
			console.log(`create dir error : ${e}`)
			throw e
		}

		//init config
		try {
			let isConfigExist = fs.existsSync(this.configPath)
			if (isConfigExist) {
				//config exist & read config
				let result = fs.readFileSync(this.configPath, {encoding: 'utf-8'})
				this.config = JSON.parse(result)
			}else {
				//config not exist & create config
				await fs.writeFileAsync(this.configPath, JSON.stringify({version: 0}))
				this.config = {version: 0}
			}
		}catch(e) {
			console.log(`init config error : ${e}`)
			throw e
		}

		//init wisnuc folder
		try{
			let isWisnucExist = await mkdirp(this.wisnucPath)
			if (isWisnucExist) {
				// has path : wisnuc folder not exist
				await this.getRelease()
			}else {
				//path is null : wisnuc folder exist
				let wisnucFiles = await fs.readdirAsync(this.wisnucPath)
				if (wisnucFiles.length == 0) await this.getRelease()
				console.log(wisnucFiles)
			}
			
		}catch(e) {
			console.log(`init wisnuc error : ${e}`)
			throw e
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
			console.log('add task into schedule')
			this.lock = true
			this.working.push(this.tasks.splice(0, 1)[0])
			this.working[0].beginUpdate()
		}
	}

	async getRelease() {

	}


}

module.exports = new Schedule()