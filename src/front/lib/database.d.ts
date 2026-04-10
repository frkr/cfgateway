export interface Message {
	id: string;
	id_parent: string;
	url: string;
	filename: string;
	content: string;
	processed_at: number;
	status: string;
	lab: boolean;
	message_count?: number;
}