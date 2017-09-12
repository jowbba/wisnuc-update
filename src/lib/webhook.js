const schedule = require('../lib/schedule')
const createHandler = require('github-webhook-handler')

const handler = createHandler({path: '/webhook', secret: 'wisnuc'})
schedule.init()

handler.on('release', (event) => {
	console.log(event, 'release')
	schedule.addEvent(event)
})

module.exports = handler