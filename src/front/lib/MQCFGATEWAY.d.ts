export type MQCFGATEWAYType =
	'in' | 'out' | 'error' | 'store' | 'dlq' | 'lost' | 'internal'
	| 'callback'


export type MQCFGATEWAYMessage = {
	id?: string;
	url?: string;
	filename?: string;
	time?: number;
	type?: MQCFGATEWAYType;
	lab?: boolean;
}

export type MQCFGATEWAYMessageAsync = {
	content?: string;
	destiny?: string;
	callback?: string;
	method?: string;
	contentType?: string;
	headers?: Map<string, string>;
};