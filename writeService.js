var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var { exec, execSync, spawn } = require('child_process')
var path = require('path')
var mkdirp = require('mkdirp')



// fs.appendFile(__dirname + 'testService', 'a \n', (err) => {
// 	console.log(err)
// 	fs.appendFile(__dirname + 'testService', 'b \n', (err) => {
// 		console.log(err)
// 	})
// })

let systemPath = path.normalize('/usr/lib/systemd/system')
let nodePath = path.normalize('/usr/bin/node')
let wisnucPath = path.normalize('/home/liu/Documents/code/cloud-cd/src/bin/www')
let servicePath = path.normalize('/usr/lib/systemd/system/wisnuc.service')
let config = `[Unit]\nDescription=Wisnuc service1\n[Service]\nExecStart=${nodePath} ${wisnucPath}\nType=idle\nRestart=always\n[Install]\nWantedBy=multi-user.target`

var test = async () => {
	try {
		// create /usr/lib/systemd/system dir
		let isSysExist = fs.existsSync(systemPath)
		if (!isSysExist) {
			console.log(`system not exist & create it`)
			await fs.mkdirAsync(systemPath)
		}

		// check is nodejs exist
		let isNodeExist = fs.existsSync(nodePath)
		if (!isNodeExist) throw new Error('nodejs not exist')

		// stop wisnuc.service 
		try {
			execSync('sudo systemctl stop wisnuc.service')
			console.log('wisnuc service has been stoped')
		}catch(e) {
			console.log('stop wisnuc error maybe wisnuc has not been init')
		}finally {}

		// write service config file
		let result = await fs.writeFileAsync(servicePath, config)

		// load wisnuc service
		execSync('sudo systemctl enable wisnuc.service')
		execSync('sudo systemctl daemon-reload')
		execSync('sudo systemctl start wisnuc.service')


	} catch (e) {
		console.log(e)
	}
}

test().then( () => {
	console.log(`end`)
})