/**
 * Proveedor de modelos Ollama para ejecución local
 * 
 * Soporta todos los modelos compatibles con Ollama:
 * - Qwen (coder, vl, chat)
 * - Llama
 * - Mistral
 * - Gemma
 * - Y más...
 */

import { EventEmitter } from 'node:events';

export interface OllamaModel {
  id: string;
  name: string;
  contextWindow: number;
  reasoning?: boolean;
  input?: Array<'text' | 'image'>;
}

export interface OllamaConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

export interface CompletionRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface CompletionResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider extends EventEmitter {
  private config: OllamaConfig;
  private availableModels: Map<string, OllamaModel> = new Map();

  constructor(config: OllamaConfig) {
    super();
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Conecta al servidor Ollama y obtiene la lista de modelos disponibles
   */
  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Ollama server responded with status ${response.status}`);
      }

      const data = await response.json() as any;
      
      for (const model of data.models || []) {
        const ollamaModel: OllamaModel = {
          id: model.name,
          name: model.name,
          contextWindow: model.details?.families?.[0]?.context_length || 4096,
          reasoning: model.name.includes('coder') || model.name.includes('reason'),
          input: model.details?.families?.[0]?.multimodal ? ['text', 'image'] : ['text'],
        };
        this.availableModels.set(model.name, ollamaModel);
      }

      this.emit('connected', { models: this.availableModels.size });
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to connect to Ollama: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene la lista de modelos disponibles
   */
  getModels(): OllamaModel[] {
    return Array.from(this.availableModels.values());
  }

  /**
   * Verifica si un modelo está disponible
   */
  isModelAvailable(modelId: string): boolean {
    return this.availableModels.has(modelId);
  }

  /**
   * Genera una completación de texto usando el modelo especificado
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const { model, prompt, system, stream = false, options = {} } = request;

    if (!this.isModelAvailable(model)) {
      throw new Error(`Model ${model} is not available. Run: ollama pull ${model}`);
    }

    const payload = {
      model,
      prompt,
      system: system || '',
      stream,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        num_predict: options.num_predict ?? 2048,
      },
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as CompletionResponse;
        
        this.emit('completion', {
          model,
          tokens: result.eval_count,
          duration: result.total_duration,
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.maxRetries! - 1) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Failed to complete request after all retries');
  }

  /**
   * Genera una completación en modo streaming
   */
  async *streamComplete(request: CompletionRequest): AsyncGenerator<string> {
    const { model, prompt, system, options = {} } = request;

    if (!this.isModelAvailable(model)) {
      throw new Error(`Model ${model} is not available`);
    }

    const payload = {
      model,
      prompt,
      system: system || '',
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        num_predict: options.num_predict ?? 2048,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              yield parsed.response;
            }
            if (parsed.done) {
              this.emit('stream-complete', {
                model,
                total_duration: parsed.total_duration,
                eval_count: parsed.eval_count,
              });
              return;
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Extrae embeddings de un texto
   */
  async embed(model: string, text: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings error: ${response.status}`);
    }

    const data = await response.json() as { embedding?: number[] };
    return data.embedding || [];
  }

  /**
   * Descarga un modelo desde el registry de Ollama
   */
  async pullModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model ${modelName}: ${response.statusText}`);
    }

    this.emit('model-pulled', modelName);
    
    // Refresh available models
    await this.connect();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Crea una instancia del proveedor Ollama con configuración por defecto
 */
export function createOllamaProvider(config?: Partial<OllamaConfig>): OllamaProvider {
  const defaultConfig: OllamaConfig = {
    baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
    timeout: 120000,
    maxRetries: 3,
  };

  return new OllamaProvider({ ...defaultConfig, ...config });
}
