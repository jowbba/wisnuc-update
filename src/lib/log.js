var color = require('colors-cli')
var fs = require('fs')
var path = require('path')

const logPath = path.join(__dirname, '../', '../', 'log')
fs.appendFileSync(logPath, `\n` + (new Date()) + ' \n')
const colorMap = new Map([
		['Error', color.red],
		['Warning', color.yellow],
		['Notice', color.cyan],
		['Progress', color.green]
	])


module.exports = (text, type) => {
	let cr = colorMap.get(type)
	if (!cr) cr = colorMap.get('Notice')
	console.log(cr(text))
	fs.appendFileSync(logPath, text + '\n')
	
}