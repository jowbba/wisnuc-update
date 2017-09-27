var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var { execSync } = require('child_process')
var path = require('path')
var zlib = require('zlib')
var os = require('os')
var tar = require('tar-fs')
var request = require('request')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var log = require('./log')


class UpdateTask {
	constructor(schedule, event) {
		this.schedule = schedule
		this.event = event
		this.type = event.event
		this.tag = event.payload.release.tag_name
		this.tarball_url = event.payload.release.tarball_url
		this.zipball_url = event.payload.release.zipball_url
		this.wisnucPath = ''
		this.state = 'ready'

		this.dirPath = path.join(this.schedule.cachedirPath, this.tag)
		this.configPath = path.join(this.dirPath, 'event.json')
		this.releasePath = path.join(this.dirPath, 'release')

		this.ballPath = path.join(this.schedule.tempdirPath, this.tag) + '.tar.gz'
		this.tarPath = path.join(this.schedule.tempdirPath, this.tag) + '.tar'	

		// log todo
	}

	async setState(nextState) {
		switch (this.state) {
			case 'ready': 
				this.leaveReadyState()
				break
			case 'log':
				this.leaveLogState()
				break
			case 'download':
				await this.leaveDownloadState()
				break
			case 'zlib':
				await this.leaveZlibState()
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
				await this.enterServiceState()
		}
	}

	beginUpdate() {
		log(`${this.tag} begin update`, 'Warning')
		this.setState('log')
	}

	leaveReadyState() {
		log(`${this.tag} leave ready state`)
	}

	leaveLogState() {
		log(`${this.tag} leave log state`)
	}

	async leaveDownloadState() {
		log(`${this.tag} leave download state`)
		// create release folder as release target
		await mkdirp(this.releasePath)
	}

	async leaveZlibState() {
		// move release dir from tag folder to wisnuc folder
		log(`${this.tag} leave zlib state`)
		try {
			let dir = await fs.readdirAsync(this.releasePath)
			if (dir.length != 1) throw new Error('number of file in release folder is wrong')
			this.wisnucPath = path.join(this.releasePath, dir[0])
			log('wisnucPath is : ' + this.wisnucPath, 'Warning')
		} catch(e) {
			log('read release dir error : ' + e, 'Error')
		}
	}

	async enterLogState() {
		log(`${this.tag} enter log state`)
		try{
			log('正在log...', 'Progress')

			await mkdirp(this.dirPath)
			log('创建tag文件夹', 'Progress')

			let createConfig = await fs.writeFileAsync(this.configPath, JSON.stringify(this.event, undefined, '\t'))
			log('创建event文件', 'Progress')

			this.setState('download')
		}catch(e) {
			this.err(`对task进行log出错` + e)
		}
	}

	enterDownloadState() {
		log(`${this.tag} enter download state`)

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
			if (index !== 1) index++
			else {
				log(`tag ball has been written ${(stream.bytesWritten/1024/1024).toFixed(2)} M`, 'Progress')
				index = 0
			}
		})
		stream.on('finish', () => {
			log(`tag ball has been written finish`, 'Progress')
			this.setState('zlib')
		})
		stream.on('error', err => this.err('stream error : ' + err))

		let handle = request(options)
		handle.on('error', err => this.err('request error:' + err))
		handle.on('response', res => log(`get response : ` + res.statusCode, 'Progress'))
		handle.pipe(stream)
	}

	enterZlibState() {
		log(`${this.tag} enter zlib state`)
		let input = fs.createReadStream(this.ballPath)
		let output = fs.createWriteStream(this.tarPath)
		output.on('finish', () => {
			log(`.gz has been extracted`, 'Progress')
			// extract tar ball after gz has been extracted
			let input = fs.createReadStream(this.tarPath)
			let output = tar.extract(this.releasePath)
			output.on('finish', () => {
				log(`.tar has been extract`, 'Progress')
				this.setState('service')
			})
			input.pipe(output)
		})
		let z = zlib.createUnzip()
		input.pipe(z).pipe(output)
	}

	async enterServiceState() {
		log(`${this.tag} enter service state`)
		let nodePath = path.normalize('/usr/bin/node')
		let systemPath = path.normalize('/usr/lib/systemd/system')
		let servicePath = path.normalize('/usr/lib/systemd/system/wisnuc.service')
		
		if (os.platform() != 'linux') return log('type of os is not linux', 'Error')


		// create /usr/lib/systemd/system dir
		try {
			let isSysExist = fs.existsSync(systemPath)
			if (!isSysExist) {
				log(`system folder not exist & create it`, 'Progress')
				await fs.mkdirAsync(systemPath)
			}else {
				log(`system folder exist`, 'Progress')
			}
		}catch (e) {
			log(`create system folder error ` + e, 'Error')
		}

		// check is nodejs exist
		let isNodeExist = fs.existsSync(nodePath)
		if (!isNodeExist) {
			throw new Error('nodejs not exist')
		}else {
			log(`node exist`, 'Progress')
		}

		// stop wisnuc.service
		try {
			execSync('sudo systemctl stop wisnuc.service')
			log('wisnuc service has been stoped', 'Progress')
		}catch(e) {
			log('stop wisnuc error maybe wisnuc has not been init', 'Error')
		}finally {
			this.schedule.writeConfig({working: false})
		}

		// write service config file
		try {
			await fs.writeFileAsync(servicePath, this.getService(nodePath, path.join(this.wisnucPath, this.schedule.options.entry)))
			log(`wisnuc service has been written`, 'Progress')
			this.schedule.writeConfig({version: parseFloat(this.tag), service: this.wisnucPath})
		}catch (e) {
			log('write service config file error' + e, 'Error')
		}

		// load wisnuc service
		execSync('sudo systemctl daemon-reload')
		execSync('sudo systemctl enable wisnuc.service')
		execSync('sudo systemctl start wisnuc.service')
		log(`wisnuc service has been started`, `Progresss`)

		//writeConfig
		await this.schedule.writeConfig({working: true})

		this.schedule.next()
	}

	getService(nodePath, wisnucPath) {
		return `[Unit]\nDescription=Wisnuc service\n[Service]\nExecStart=${nodePath} ${wisnucPath}\nType=idle\nRestart=always\n[Install]\nWantedBy=multi-user.target`
	}

	err(e) {
		if (e) log(e, 'Error')
		log('there is error in update, restart update', 'Warning')
		rimraf(this.dirPath, () => {
			this.state = 'ready'
			this.beginUpdate()
		})
	}
}

module.exports = (schedule, event) => new UpdateTask(schedule, event)