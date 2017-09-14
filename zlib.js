var promise = require('bluebird')
var fs = promise.promisifyAll(require('fs'))
var path = require('path')
var zlib = require('zlib')
var tar = require('tar-fs')

let inputPath = path.join(process.cwd(), '1.1.tar.gz')
let outputPath = path.join(process.cwd(), 'temp', '1.1.tar')
let tarPath = path.join(process.cwd(), 'temp')


let input = fs.createReadStream(inputPath)
let output = fs.createWriteStream(outputPath)

output.on('finish', () => {
	let input = fs.createReadStream(outputPath)

	input.pipe(tar.extract(tarPath))
})


let z = zlib.createUnzip()
input.pipe(z).pipe(output)