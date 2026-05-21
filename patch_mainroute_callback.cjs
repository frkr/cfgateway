const fs = require('fs');
const file = 'src/front/.server/mainroute/mainroute.ts';
let code = fs.readFileSync(file, 'utf8');

const replacementOutPromise = `
	let promises = [inPromise, outPromise];

	if (asyncConfig.callback) {
		const callbackPromise = Promise.all([
			env.CFGATEWAY.put(outFilename, destinyBody), // Overwrites with same content
			env.MQCFGATEWAY.send({
				id: outId,
				parent: inId,
				url: asyncConfig.callback,
				filename: outFilename,
				time: destinyTime.getTime(),
				type: 'callback',
				lab
			} as MQCFGATEWAYMessage, { contentType: 'json' })
		]);
		promises.push(callbackPromise);
	}

	ctx.waitUntil(Promise.all(promises));`;

code = code.replace('ctx.waitUntil(Promise.all([inPromise, outPromise]));', replacementOutPromise.trim());

fs.writeFileSync(file, code);
