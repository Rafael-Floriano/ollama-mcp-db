export interface ChatMessage {
  role: string;
  content: string;
}

export interface TableStructure {
  table_name: string;
  columns: string[];
}