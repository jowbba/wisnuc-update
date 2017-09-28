var request = require('request')

var serverGet = (url, headers={}, qs={}) => {
	return new Promise((resolve,reject) => {
		let options = {method: 'GET', url, headers}
		request(options, (err, res) => {
			if (err) reject(err)
			else if (res.statusCode != 200) {
				console.log(res.headers)
				let e = new Error('http status code not 200')
      	e.code = 'EHTTPSTATUS'
      	e.status = res.statusCode
      	reject(e)
			}else {
				resolve(JSON.parse(res.body))
			}
		})
	})
}
module.exports = { serverGet }