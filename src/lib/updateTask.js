var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var path = require('path')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
		// let stream = fs.createWriteStream(__dirname + '/event.json')
		// stream.write(JSON.stringify(event, undefined, '\t'), 'utf8', (err) => {
		// 	console.log('写入完成',err)
		// })


class UpdateTask {
	constructor(schedule, event) {
		this.schedule = schedule
		this.event = event
		this.type = event.event
		this.tag = event.payload.release.tag_name
		this.tarball_url = event.payload.release.tarball_url
		this.zipball_url = event.payload.release.zipball_url
		this.state = 'ready'
		this.dirPath = path.join(this.schedule.cachedirPath, this.tag)
		this.configPath = path.join(this.dirPath, 'event.json')
	}

	setState(nextState) {
		switch (this.state) {
			case 'ready': 
				this.leaveReadyState()
				break

			case 'log':
				this.leaveLogState()
				break
		}

		switch (nextState) {
			case 'log' :
				this.enterLogState()
				break
		}
	}

	beginUpdate() {
		console.log(`${this.tag} begin update`)
		this.setState('log')
	}

	leaveReadyState() {
		console.log(`${this.tag} leave ready state`)
	}

	leaveLogState() {

	}

	async enterLogState() {
		console.log(`${this.tag} enter log state`)
		this.state = 'log'
		try{
			console.log('正在log...')
			let createTag = mkdirp(this.dirPath)

			console.log('创建tag文件夹...', createTag)
			let createConfig = await fs.writeFileAsync(this.configPath, JSON.stringify(this.event, undefined, '\t'))
			console.log('创建event文件...', createConfig)
		}catch(e) {
			console.log(e)
		}
	}
}

module.exports = (schedule, event) => new UpdateTask(schedule, event)