import database from './pathroute.database.json';
import type { MQCFGATEWAYHeaders, MQCFGATEWAYMessageAsync } from './MQCFGATEWAY';

export const PATH_ROUTE_METHODS = ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'] as const;

export type PathRouteMethod = typeof PATH_ROUTE_METHODS[number];

export type PathRouteHeaderEntry = {
	key: string;
	value: string;
};

export type PathRouteRow = {
	id: string;
	path: string;
	destiny: string;
	callback: string | null;
	method_destiny: string;
	method_callback: string | null;
	content_type_destiny: string | null;
	content_type_callback: string | null;
	headers_destiny: string | null;
	headers_callback: string | null;
	enabled: number;
	is_async: number;
	created_at: number;
	updated_at: number;
};

export type PathRoute = {
	id: string;
	path: string;
	destiny: string;
	callback: string;
	methodDestiny: PathRouteMethod;
	methodCallback: PathRouteMethod;
	contentTypeDestiny: string;
	contentTypeCallback: string;
	headersDestiny: PathRouteHeaderEntry[];
	headersCallback: PathRouteHeaderEntry[];
	enabled: boolean;
	isAsync: boolean;
	createdAt: number;
	updatedAt: number;
};

export function normalizePathKey(value: string) {
	return value.trim().replace(/^\/+|\/+$/g, '');
}

export function normalizeMethodDestiny(value: string) {
	return value.trim().toUpperCase() as PathRouteMethod;
}

export function isPathRouteMethod(value: string): value is PathRouteMethod {
	return PATH_ROUTE_METHODS.includes(value as PathRouteMethod);
}

function parseHeaderEntries(rawValue: string | null) {
	if (!rawValue) {
		return [] as PathRouteHeaderEntry[];
	}
	
	try {
		const parsed = JSON.parse(rawValue) as MQCFGATEWAYHeaders | PathRouteHeaderEntry[];
		
		if (Array.isArray(parsed)) {
			return parsed
				.filter((entry) => entry && typeof entry.key === 'string')
				.map((entry) => ({
					key: entry.key,
					value: typeof entry.value === 'string' ? entry.value : ''
				}));
		}
		
		return Object.entries(parsed || {}).map(([key, value]) => ({
			key,
			value: String(value)
		}));
	} catch (e) {
		return [];
	}
}

export function toHeadersRecord(entries: PathRouteHeaderEntry[]) {
	return entries.reduce((acc, entry) => {
		const key = entry.key.trim();
		if (!key) {
			return acc;
		}
		
		acc[key] = entry.value;
		return acc;
	}, {} as MQCFGATEWAYHeaders);
}

export function toHeadersStorage(entries: PathRouteHeaderEntry[]) {
	const headers = toHeadersRecord(entries);
	return Object.keys(headers).length > 0 ? JSON.stringify(headers) : null;
}

export function toPathRoute(row: PathRouteRow): PathRoute {
	return {
		id: row.id,
		path: row.path,
		destiny: row.destiny,
		callback: row.callback || '',
		methodDestiny: normalizeMethodDestiny(row.method_destiny),
		methodCallback: normalizeMethodDestiny(row.method_callback || 'POST'),
		contentTypeDestiny: row.content_type_destiny || '',
		contentTypeCallback: row.content_type_callback || '',
		headersDestiny: parseHeaderEntries(row.headers_destiny),
		headersCallback: parseHeaderEntries(row.headers_callback),
		enabled: row.enabled === 1,
		isAsync: row.is_async === 1,
		createdAt: Number(row.created_at),
		updatedAt: Number(row.updated_at)
	};
}

export async function ensurePathRoutesTable(env: Env) {
	await env.DB.prepare(database.createTable).run();
	
	for (const query of [
		database.alterAddCallback,
		database.alterAddMethodCallback,
		database.alterAddContentTypeDestiny,
		database.alterAddContentTypeCallback,
		database.alterAddHeadersDestiny,
		database.alterAddHeadersCallback,
		database.alterAddIsAsync
	]) {
		try {
			await env.DB.prepare(query).run();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			if (!message.includes('duplicate column name')) {
				throw e;
			}
		}
	}
}

export function toPathRouteAsync(row: PathRoute) {
	const asyncConfig: MQCFGATEWAYMessageAsync = {
		destiny: row.destiny,
		methodDestiny: row.methodDestiny
	};
	
	if (row.callback) {
		asyncConfig.callback = row.callback;
	}
	if (row.methodCallback) {
		asyncConfig.methodCallback = row.methodCallback;
	}
	if (row.contentTypeDestiny) {
		asyncConfig.contentTypeDestiny = row.contentTypeDestiny;
	}
	if (row.contentTypeCallback) {
		asyncConfig.contentTypeCallback = row.contentTypeCallback;
	}
	
	const headersDestiny = toHeadersRecord(row.headersDestiny);
	if (Object.keys(headersDestiny).length > 0) {
		asyncConfig.headersDestiny = headersDestiny;
	}
	
	const headersCallback = toHeadersRecord(row.headersCallback);
	if (Object.keys(headersCallback).length > 0) {
		asyncConfig.headersCallback = headersCallback;
	}
	
	return asyncConfig;
}
