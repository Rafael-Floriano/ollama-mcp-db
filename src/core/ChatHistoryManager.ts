import { ChatMessage } from "../types/index.js";


export class ChatHistoryManager {
  private history: ChatMessage[] = [];
  private readonly maxLength = 20;

  add(role: string, content: string) {
    this.history.push({ role, content });
    if (this.history.length > this.maxLength) {
      this.history.shift();
    }
  }

  get() {
    return this.history;
  }
}
