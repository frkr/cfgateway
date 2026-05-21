const fs = require('fs');
const file = 'src/front/.server/panel/paths.ts';
let code = fs.readFileSync(file, 'utf8');

const replacementDestiny = `	const destinyUrl = new URL(destiny);
	if (destinyUrl.protocol !== 'http:' && destinyUrl.protocol !== 'https:') {
		throw new Error('Invalid destiny protocol.');
	}`;

const replacementCallback = `	if (callback) {
		const callbackUrl = new URL(callback);
		if (callbackUrl.protocol !== 'http:' && callbackUrl.protocol !== 'https:') {
			throw new Error('Invalid callback protocol.');
		}
	}`;

code = code.replace('\tnew URL(destiny);', replacementDestiny);
code = code.replace(/\tif \(callback\) \{\n\t\tnew URL\(callback\);\n\t\}/, replacementCallback);

fs.writeFileSync(file, code);
