var promise = require('bluebird')
var fs = require('fs')
var path = require('path')
var mkdirp = promise.promisify(require('mkdirp'))
var rimraf = promise.promisify(require('rimraf'))
var updateCreater = require('./updateTask')
var { serverGet } = require('../utils/server')
var log = require('./log')

const dirPath = path.join(__dirname, '../', '../')

class Schedule {
	constructor() {
		this.configPath = path.join(dirPath, 'config.json')
		this.optionsPath = path.join(dirPath, 'options.js')
		this.cachedirPath = path.join(dirPath, 'cache')
		this.tempdirPath = path.join(dirPath, 'temp')
		this.wisnucPath = path.join(dirPath, 'wisnuc')
		this.tasks = []
		this.working = []
		this.finish = []
		this.config = {}
		this.options = {}
		this.lock = false
	}

	async init() {
		log(`begin init`, 'Warning')
		//init options
		try {
			log(`init options...`,)
			let options = fs.readFileSync(this.optionsPath, {encoding: 'utf-8'})
			if (options) this.options = require('../../options.js')
		}catch (e) {
			log(`get options error : ${e}`, 'Error')
			throw e
		}

		//init config
		try {
			log(`init config...`)
			let isConfigExist = fs.existsSync(this.configPath)
			if (isConfigExist) {
				log(`config exist`, 'Progress')
				//config exist & read config
				let result = fs.readFileSync(this.configPath, {encoding: 'utf-8'})
				this.config = JSON.parse(result)
			}else {
				log(`config not exist`, 'Progress')
				//config not exist & create config
				await this.writeConfig({version: 0, service: '', working: false})
			}
		}catch (e) {
			log(`init config error : ${e}`, 'Error')
			throw e
		}

		//remove temp folder & create temp/cache directory
		try {
			log(`init folder...`)
			await rimraf(this.tempdirPath)
			await mkdirp(this.tempdirPath)
			await mkdirp(this.cachedirPath)
		}catch (e) {
			log(`create dir error : ${e}`, 'Error')
			throw e
		}

		this.getRelease()
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
			log('add task into schedule')
			this.lock = true
			this.working.push(this.tasks.splice(0, 1)[0])
			this.working[0].beginUpdate()
		}
	}

	next() {
		this.lock = false
		this.finish.push(this.working.splice(0,1)[0])
		this.schedule()
	}

	err() {
		
	}

	async getRelease() {
		log(`get lastest release`, 'Warning')
		let url = this.options.githubRepository
		try{
			let release = await serverGet(this.options.githubRepository, { 'User-Agent': '4111s981379@qq.com'})
			let version = parseFloat(release.tag_name)
			if (version > this.config.version) {
				log(`need download new release`, 'Progress')
				let eventObj = { payload : {release }, event: 'getRelease'}
				this.addEvent(eventObj)
			}else {
				log(`not need to download`, 'Progress')
			}
		}catch (e) {
			log(e + `get lastest release error`, 'Error')
		}
	}

	async writeConfig(obj) {
		let configObj = Object.assign({}, this.config, obj)
		await fs.writeFileAsync(this.configPath, JSON.stringify(configObj))
		this.config = configObj
	}
}

module.exports = new Schedule()