var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var { spawn } = require('child_process')
var path = require('path')
var zlib = require('zlib')
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
		this.ballTempPath = path.join(this.schedule.tempdirPath, this.tag) + '.tar.gz'
		this.ballPath = path.join(this.dirPath, this.tag) + '.tar.gz'
		this.tarPath = path.join(this.dirPath, this.tag) + '.tar'
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
	}

	leaveZlibState() {
		console.log(`${this.tag} leave zlib state`)	
	}

	async enterLogState() {
		console.log(`${this.tag} enter log state`)
		this.state = 'log'
		try{
			console.log('正在log...')
			mkdirp(this.dirPath)
			console.log('创建tag文件夹...')
			let createConfig = await fs.writeFileAsync(this.configPath, JSON.stringify(this.event, undefined, '\t'))
			console.log('创建event文件...', createConfig)
			this.setState('download')
		}catch(e) {
			console.log(`对task进行log出错`, e)
		}
	}

	async enterDownloadState() {
		console.log(`${this.tag} enter download state`)
		this.state = 'download'

		let options = {
			url: this.tarball_url,
			headers: {
				'User-Agent': '411981379@qq.com',
				'Accept-Encoding': 'gzip,deflate'
			}
		}
		let index = 0
		let stream = fs.createWriteStream(this.ballTempPath)
		stream.on('drain', () => {
			if (index != 15) index++
			else {
				console.log(`tag ball has been written ${(stream.bytesWritten/1024/1024).toFixed(2)} M`)
				index = 0
			}
		})
		stream.on('finish', () => {
			console.log(`tag ball has been written finish`)
			fs.rename(this.ballTempPath, this.ballPath, err => {
				if (err) throw err
				console.log('file move success')
				this.setState('zlib')
			})
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
			let output = tar.extract(this.dirPath)
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
	}
}

module.exports = (schedule, event) => new UpdateTask(schedule, event)