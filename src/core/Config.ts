export interface OllamaConfig {
  model: string;
  host: string;
  inference: {
    threads: number;
    num_predict: number;
    temperature: number;
    top_k: number;
    top_p: number;
    repeat_penalty: number;
    stop: string[];
  };
  retry: {
    max_attempts: number;
    delays: number[];
  };
}

export const DEFAULT_CONFIG: OllamaConfig = {
  model: process.env.OLLAMA_MODEL || "qwen2.5-coder:7b-instruct",
  host: process.env.OLLAMA_HOST || "http://localhost:11434",
  inference: {
    threads: 8,           // Otimizado para CPU i5 10ª geração
    num_predict: 200,     // Reduzido para respostas mais concisas
    temperature: 0.1,     // Reduzido para mais consistência
    top_k: 40,           // Reduzido para menos diversidade
    top_p: 0.9,          // Reduzido para mais foco
    repeat_penalty: 1.1,  // Aumentado para evitar repetições
    stop: [] // Sem stops para teste
  },
  retry: {
    max_attempts: 2,
    delays: [100, 500] // Backoff exponencial
  }
};

export const getConfig = (): OllamaConfig => DEFAULT_CONFIG;

export const Config = {
  // Timeouts - Aumentados para evitar timeouts
  OLLAMA_TIMEOUT_MS: 15000, // Aumentado para 15s
  DATABASE_TIMEOUT_MS: 10000, // Aumentado para 10s
  REQUEST_TIMEOUT_MS: 20000, // Aumentado para 20s
  
  // Retry settings
  MAX_RETRIES: 2, // Aumentado para 2 tentativas
  
  // Cache settings
  SCHEMA_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutos
  
  // LLM settings - Ajustados para melhor performance
  TEMPERATURE: 0.1, // Reduzido para mais consistência
  MAX_TOKENS: 200, // Reduzido para respostas mais rápidas
  
  // Request limits
  MAX_QUESTION_LENGTH: 1000,
  MAX_PAYLOAD_SIZE: '1mb',
  
  // Server settings
  PORT: 3001,
  
  // Database settings
  CONNECTION_POOL_SIZE: 10,
} as const; 