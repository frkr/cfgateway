const fs = require('fs');
const file = 'src/front/.server/mainroute/mainroute.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `			let normalizedPath = normalizePathKey(pathname);
			let fullpathFallback = null;
			if (normalizedPath.includes('/')) {
				fullpathFallback = normalizedPath.substring(normalizedPath.indexOf('/'));
				normalizedPath = normalizePathKey(normalizedPath.substring(0, normalizedPath.indexOf('/')));
			}
			const routeFallback = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
			if (routeFallback && routeFallback.is_async === 0) {
				return await handleSync(request, content, routeFallback, env, ctx, lab, fullpathFallback);
			}`;

const replacement = `			try {
				let normalizedPath = normalizePathKey(pathname);
				let fullpathFallback = null;
				if (normalizedPath.includes('/')) {
					fullpathFallback = normalizedPath.substring(normalizedPath.indexOf('/'));
					normalizedPath = normalizePathKey(normalizedPath.substring(0, normalizedPath.indexOf('/')));
				}
				const routeFallback = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
				if (routeFallback && routeFallback.is_async === 0) {
					return await handleSync(request, content, routeFallback, env, ctx, lab, fullpathFallback);
				}
			} catch (e) {
				// Ignore DB errors here, fallthrough to async queue
				if (e instanceof Error && !e.message.includes('no such table')) {
					console.error('DB error reading async route fallback:', e);
				}
			}`;

code = code.replace(search, replacement);
fs.writeFileSync(file, code);
