var promise = require('bluebird')
var fs = require('fs')
var path = require('path')
var mkdirp = promise.promisify(require('mkdirp'))
var rimraf = promise.promisify(require('rimraf'))
var updateCreater = require('./updateTask')
var {serverGet} = require('../utils/server')

const dirPath = path.join(__dirname, '../', '../')

class Schedule {
	constructor() {
		this.configPath = path.join(dirPath, 'config.json')
		this.cachedirPath = path.join(dirPath, 'cache')
		this.tempdirPath = path.join(dirPath, 'temp')
		this.wisnucPath = path.join(dirPath, 'wisnuc')
		this.optionsPath = path.join(dirPath, 'options.js')
		this.tasks = []
		this.working = []
		this.finish = []
		this.config = {}
		this.options = {}
		this.lock = false
	}

	async init() {

		console.log(`begin init...`)
		//init options
		try {
			console.log(`init options...`)
			let options = fs.readFileSync(this.optionsPath, {encoding: 'utf-8'})
			if (options) this.options = require('../../options.js')
		}catch (e) {
			console.log(`get options error : ${e}`)
			throw e
		}

		//remove temp folder & create temp/cache directory
		try {
			console.log(`init folder...`)
			await rimraf(this.tempdirPath)
			await mkdirp(this.tempdirPath)
			await mkdirp(this.cachedirPath)
		}catch(e) {
			console.log(`create dir error : ${e}`)
			throw e
		}

		//init config
		try {
			console.log(`init config...`)
			let isConfigExist = fs.existsSync(this.configPath)
			if (isConfigExist) {
				console.log(`config exist`)
				//config exist & read config
				let result = fs.readFileSync(this.configPath, {encoding: 'utf-8'})
				this.config = JSON.parse(result)
			}else {
				console.log(`config not exist`)
				//config not exist & create config
				await fs.writeFileAsync(this.configPath, JSON.stringify({version: 0, service: ''}))
				this.config = {version: 0}
			}
		}catch (e) {
			console.log(`init config error : ${e}`)
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
			console.log('add task into schedule')
			this.lock = true
			this.working.push(this.tasks.splice(0, 1)[0])
			this.working[0].beginUpdate()
		}
	}

	async getRelease() {
		console.log(`get lastest release`)
		let url = this.options.githubRepository
		console.log(url)
		try{
			let release = await serverGet(this.options.githubRepository, { 'User-Agent': '411981379@qq.com'})
			let version = parseFloat(release.tag_name)
			if (version > this.config.version) {
				console.log(`need download new release`)
				let eventObj = { payload : {release }, event: 'getRelease'}
				this.addEvent(eventObj)
			}else {
				console.log(`not need to download`)
			}
		}catch (e) {
			console.log(e, `get lastest release error`)
		}
	}
}

module.exports = new Schedule()