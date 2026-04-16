export function checkAdminAuth(request: Request, env: Env) {
	const authHeader = request.headers.get('Authorization');
	const token = authHeader ? authHeader.replace('Bearer ', '') : null;
	
	if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
		return false;
	}
	
	return true;
}

export function isJsonRequest(request: Request) {
	const accept = request.headers.get('Accept') || '';
	const url = new URL(request.url);
	
	return accept.includes('application/json') || url.searchParams.has('json');
}
