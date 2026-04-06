export type MQCFGATEWAYType = 'in' | 'out' | 'error' | 'process' | 'store' | 'dlq' | 'lost' | 'internal' | 'callback';

export type MQCFGATEWAYMessage = {
	id: string;
	url: string;
	filename: string;
	type?: MQCFGATEWAYType;
	time: number;
}

export type MQCFGATEWAYMessageAsync = {
	content?: string;
	destiny?: string;
	callback?: string;
	method?: string;
	contentType?: string;
	headers?: Map<string, string>;
};