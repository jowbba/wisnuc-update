const schedule = require('../lib/schedule')
const createHandler = require('github-webhook-handler')

const handler = createHandler({path: '/webhook', secret: 'wisnuc'})
schedule.init().catch(e => {
	console.log(e)
})

handler.on('release', (event) => {
	console.log('release event trigger')
	schedule.addEvent(event)
})

module.exports = handler