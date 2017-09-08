const fs = require('fs')

const createHandler = require('github-webhook-handler')
const handler = createHandler({path: '/webhook', secret: 'wisnuc'})

// handler.on('push', (event) => {
// 	console.log(event, 'push')
// })

handler.on('release', (event) => {
	console.log(event, 'release')
	let stream = fs.createWriteStream(__dirname + '/event.json')
	stream.write(JSON.stringify(event, undefined, '\t'), 'utf8', (err) => {
		console.log('写入完成',err)
	})

})

module.exports = handler