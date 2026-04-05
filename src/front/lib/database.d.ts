export interface Message {
  id: string;
  id_parent: string;
  filename: string;
  content: string;
  processed_at: number;
  status: string;
}