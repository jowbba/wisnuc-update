var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var { spawn } = require('child_process')
var path = require('path')
var zlib = require('zlib')
var os = require('os')
var tar = require('tar-fs')
var request = require('request')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')


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
		this.releasePath = path.join(this.dirPath, 'release')

		this.ballPath = path.join(this.schedule.tempdirPath, this.tag) + '.tar.gz'
		this.tarPath = path.join(this.schedule.tempdirPath, this.tag) + '.tar'	

		// log todo
	}

	setState(nextState) {
		switch (this.state) {
			case 'ready': 
				this.leaveReadyState()
				break
			case 'log':
				this.leaveLogState()
				break
			case 'download':
				this.leaveDownloadState()
				break
			case 'zlib':
				this.leaveZlibState()
				break
		}

		this.state = nextState

		switch (nextState) {
			case 'log' :
				this.enterLogState()
				break
			case 'download':
				this.enterDownloadState()
				break
			case 'zlib':
				this.enterZlibState()
				break
			case 'service':
				this.enterServiceState()
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
		console.log(`${this.tag} leave log state`)
	}

	leaveDownloadState() {
		console.log(`${this.tag} leave download state`)
		// create release folder as release target
		mkdirp(this.releasePath)
	}

	async leaveZlibState() {
		// move release dir from tag folder to wisnuc folder
		console.log(`${this.tag} leave zlib state`)
		try {
			let dir = await fs.readdirAsync(this.releasePath)
			if (dir.length != 1) throw new Error('number of file in release folder is wrong')
			let wisnucPath = path.join(this.releasePath, dir[0])
			console.log(wisnucPath)
		} catch(e) {
			console.log('read release dir error ', e)
		}
	}

	async enterLogState() {
		console.log(`${this.tag} enter log state`)
		try{
			console.log('正在log...')

			mkdirp(this.dirPath)
			console.log('创建tag文件夹')

			let createConfig = await fs.writeFileAsync(this.configPath, JSON.stringify(this.event, undefined, '\t'))
			console.log('创建event文件', createConfig)

			this.setState('download')
		}catch(e) {
			console.log(`对task进行log出错`, e)
		}
	}

	async enterDownloadState() {
		console.log(`${this.tag} enter download state`)

		let options = {
			url: this.tarball_url,
			headers: {
				'User-Agent': '411981379@qq.com',
				'Accept-Encoding': 'gzip,deflate'
			}
		}
		let index = 0
		let stream = fs.createWriteStream(this.ballPath)
		stream.on('drain', () => {
			if (index != 15) index++
			else {
				console.log(`tag ball has been written ${(stream.bytesWritten/1024/1024).toFixed(2)} M`)
				index = 0
			}
		})
		stream.on('finish', () => {
			console.log(`tag ball has been written finish`)
			this.setState('zlib')
		})
		stream.on('error', err => console.log('stream error : ', err))

		let handle = request(options)
		handle.on('error', err => console.log('request error:', err))
		handle.on('response', res => console.log(`get response : `, res.statusCode))
		handle.pipe(stream)
	}

	enterZlibState() {
		console.log(`${this.tag} enter zlib state`)
		let input = fs.createReadStream(this.ballPath)
		let output = fs.createWriteStream(this.tarPath)
		output.on('finish', () => {
			console.log(`.gz has been extracted`)
			// extract tar ball after gz has been extracted
			let input = fs.createReadStream(this.tarPath)
			let output = tar.extract(this.releasePath)
			output.on('finish', () => {
				console.log(`.tar has been extract`)
				this.setState('service')
			})
			input.pipe(output)
		})
		let z = zlib.createUnzip()
		input.pipe(z).pipe(output)
	}

	enterServiceState() {
		console.log(`${this.tag} enter service state`)
		if (os.platform() != 'linux') return console.log('type of os is not linux')
		if (this.schedule.service == '') {
			//service not exist
		}
	}
}

module.exports = (schedule, event) => new UpdateTask(schedule, event)