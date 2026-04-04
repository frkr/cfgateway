
export type MQCFGATEWAYType = "in" | "out"| "error"| "process"|"store"| "dlq";

export type MQCFGATEWAYMessage = {
  id: string;
  url: string;
  filename: string;
  type?: MQCFGATEWAYType;
  time: number;
}
