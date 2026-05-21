const fs = require('fs');
const file = 'src/front/.server/mainroute/mainroute.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
			let normalizedPath = normalizePathKey(pathname);
			let fullpathFallback = null;
			if (normalizedPath.includes('/')) {
				fullpathFallback = normalizedPath.substring(normalizedPath.indexOf('/'));
				normalizedPath = normalizePathKey(normalizedPath.substring(0, normalizedPath.indexOf('/')));
			}
			const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
			if (route && route.is_async === 0) {
				return await handleSync(request, content, route, env, ctx, lab, fullpathFallback);
			}

			await queueMessage(content, request.url, env, lab);`;

code = code.replace('\t\t\tawait queueMessage(content, request.url, env, lab);', replacement.trim());
fs.writeFileSync(file, code);
