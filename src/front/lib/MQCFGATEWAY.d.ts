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

export type MQCFGATEWAYHeaders = Record<string, string>;

export type MQCFGATEWAYMessageAsync = {
	content?: string; // Content to send to destiny
	destiny?: string; // URL to send it
	callback?: string; // URL to send the response from Destiny
	methodDestiny?: string; // HTTP method to use to Destiny
	methodCallback?: string; // HTTP method to use to Callback
	contentTypeDestiny?: string; // Content-Type header to use to Destiny
	contentTypeCallback?: string; // Content-Type header to use to Callback
	headersDestiny?: MQCFGATEWAYHeaders; // Headers to send to Destiny
	headersCallback?: MQCFGATEWAYHeaders; // Headers to send to Callback
};
