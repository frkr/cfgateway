const fs = require('fs');
const file = 'src/front/.server/mainroute/mainroute.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
			if (pathname === '/sync' || pathname.startsWith('/sync/')) {
				let normalizedPath = normalizePathKey(pathname.substring(6));
				if (!normalizedPath) {
					throw new Error('Sync path is required.');
				}
				let fullpath = null;
				if (normalizedPath.includes('/')) {
					fullpath = normalizedPath.substring(normalizedPath.indexOf('/'));
					normalizedPath = normalizePathKey(normalizedPath.substring(0, normalizedPath.indexOf('/')));
				}

				const route = await env.DB.prepare(database.selectByPath).bind(normalizedPath).first<PathRouteRow>();
				if (!route) {
					throw new Error(\`Sync route not found for path: \${normalizedPath}\`);
				}

				return await handleSync(request, content, route, env, ctx, lab, fullpath);
			}

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

			await queueMessage(content, request.url, env, lab);`;

code = code.replace(/if \(pathname === '\/sync' \|\| pathname\.startsWith\('\/sync\/'\)\) \{[\s\S]*?await queueMessage\(content, request\.url, env, lab\);/, replacement.trim());
fs.writeFileSync(file, code);
