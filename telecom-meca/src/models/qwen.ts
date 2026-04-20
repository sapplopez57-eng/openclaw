/**
 * Proveedor de modelos Qwen para ejecución local
 * 
 * Soporta modelos Qwen a través de:
 * - Ollama (recomendado para ejecución local)
 * - API directa (si está disponible)
 * - vLLM u otros servidores compatibles con OpenAI
 */

import { EventEmitter } from 'node:events';

export interface QwenModel {
  id: string;
  name: string;
  contextWindow: number;
  reasoning?: boolean;
  input?: Array<'text' | 'image'>;
  multimodal?: boolean;
}

export interface QwenConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  mode?: 'ollama' | 'openai-compatible' | 'direct';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class QwenProvider extends EventEmitter {
  private config: QwenConfig;
  private availableModels: Map<string, QwenModel> = new Map();

  // Modelos Qwen recomendados para telecomunicaciones y mecatrónica
  private readonly RECOMMENDED_MODELS: QwenModel[] = [
    {
      id: 'qwen2.5-coder:7b',
      name: 'Qwen 2.5 Coder 7B',
      contextWindow: 32768,
      reasoning: true,
      input: ['text'],
    },
    {
      id: 'qwen2.5-coder:14b',
      name: 'Qwen 2.5 Coder 14B',
      contextWindow: 32768,
      reasoning: true,
      input: ['text'],
    },
    {
      id: 'qwen2.5-coder:32b',
      name: 'Qwen 2.5 Coder 32B',
      contextWindow: 32768,
      reasoning: true,
      input: ['text'],
    },
    {
      id: 'qwen2.5-vl:7b',
      name: 'Qwen 2.5 Vision-Language 7B',
      contextWindow: 32768,
      reasoning: false,
      input: ['text', 'image'],
      multimodal: true,
    },
    {
      id: 'qwen2.5:7b',
      name: 'Qwen 2.5 7B',
      contextWindow: 32768,
      reasoning: false,
      input: ['text'],
    },
    {
      id: 'qwen2.5-math:7b',
      name: 'Qwen 2.5 Math 7B',
      contextWindow: 32768,
      reasoning: true,
      input: ['text'],
    },
  ];

  constructor(config: QwenConfig) {
    super();
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      apiKey: config.apiKey,
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
      mode: config.mode || 'ollama',
    };

    // Inicializar con modelos recomendados
    for (const model of this.RECOMMENDED_MODELS) {
      this.availableModels.set(model.id, model);
    }
  }

  /**
   * Conecta al servidor Qwen y verifica disponibilidad
   */
  async connect(): Promise<void> {
    try {
      if (this.config.mode === 'ollama') {
        await this.connectOllama();
      } else {
        await this.connectOpenAICompatible();
      }

      this.emit('connected', { models: this.availableModels.size });
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to connect to Qwen: ${(error as Error).message}`);
    }
  }

  private async connectOllama(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Ollama server responded with status ${response.status}`);
    }

    const data = await response.json() as { data?: Array<{ id: string }> };
    
    // Actualizar modelos disponibles basados en lo que está instalado
    for (const model of data.models || []) {
      if (model.name.includes('qwen')) {
        const existingModel = this.RECOMMENDED_MODELS.find(m => model.name.startsWith(m.id.split(':')[0]));
        if (existingModel) {
          this.availableModels.set(model.name, {
            ...existingModel,
            id: model.name,
            name: model.name,
          });
        }
      }
    }
  }

  private async connectOpenAICompatible(): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(`${this.config.baseUrl}/v1/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json() as { data?: Array<{ id: string }> };
    
    for (const model of data.data || []) {
      if (model.id.includes('qwen')) {
        this.availableModels.set(model.id, {
          id: model.id,
          name: model.id,
          contextWindow: 32768,
          reasoning: model.id.includes('coder') || model.id.includes('math'),
          input: ['text'],
        });
      }
    }
  }

  /**
   * Obtiene la lista de modelos disponibles
   */
  getModels(): QwenModel[] {
    return Array.from(this.availableModels.values());
  }

  /**
   * Obtiene modelos recomendados para una tarea específica
   */
  getRecommendedModels(task?: 'coding' | 'math' | 'vision' | 'general'): QwenModel[] {
    const allModels = this.getModels();
    
    if (!task) return allModels;

    switch (task) {
      case 'coding':
        return allModels.filter(m => m.id.includes('coder'));
      case 'math':
        return allModels.filter(m => m.id.includes('math') || m.reasoning);
      case 'vision':
        return allModels.filter(m => m.multimodal || (m.input && m.input.includes('image')));
      default:
        return allModels;
    }
  }

  /**
   * Verifica si un modelo está disponible
   */
  isModelAvailable(modelId: string): boolean {
    return this.availableModels.has(modelId);
  }

  /**
   * Genera una completación de chat usando el modelo especificado
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { model, messages, stream = false, temperature = 0.7, max_tokens = 2048, top_p = 0.9 } = request;

    if (!this.isModelAvailable(model)) {
      throw new Error(`Model ${model} is not available. Run: ollama pull ${model}`);
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        let response: Response;

        if (this.config.mode === 'ollama') {
          // Convertir formato OpenAI a formato Ollama
          const systemMessage = messages.find(m => m.role === 'system');
          const userMessages = messages.filter(m => m.role !== 'system');
          
          const lastUserMessage = userMessages.filter(m => m.role === 'user').pop();
          const prompt = typeof lastUserMessage?.content === 'string' 
            ? lastUserMessage.content 
            : '';

          const payload = {
            model,
            prompt,
            system: systemMessage?.content || '',
            stream,
            options: {
              temperature,
              top_p,
              num_predict: max_tokens,
            },
          };

          response = await fetch(`${this.config.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        } else {
          // Formato OpenAI compatible
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          }

          const payload = {
            model,
            messages,
            stream,
            temperature,
            max_tokens,
            top_p,
          };

          response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Qwen API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as ChatCompletionResponse;
        
        this.emit('completion', {
          model,
          tokens: result.usage?.total_tokens,
        });

        // Normalizar respuesta a formato OpenAI
        if (this.config.mode === 'ollama') {
          return {
            id: `ollama-${Date.now()}`,
            model,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: result.response || '',
              },
              finish_reason: result.done ? 'stop' : 'length',
            }],
            usage: {
              prompt_tokens: result.prompt_eval_count || 0,
              completion_tokens: result.eval_count || 0,
              total_tokens: (result.prompt_eval_count || 0) + (result.eval_count || 0),
            },
          };
        }

        return result as ChatCompletionResponse;
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
  async *streamChat(request: ChatCompletionRequest): AsyncGenerator<string> {
    const { model, messages, temperature = 0.7, max_tokens = 2048, top_p = 0.9 } = request;

    if (!this.isModelAvailable(model)) {
      throw new Error(`Model ${model} is not available`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      let response: Response;

      if (this.config.mode === 'ollama') {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        const lastUserMessage = userMessages.filter(m => m.role === 'user').pop();
        const prompt = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';

        const payload = {
          model,
          prompt,
          system: systemMessage?.content || '',
          stream: true,
          options: { temperature, top_p, num_predict: max_tokens },
        };

        response = await fetch(`${this.config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.config.apiKey) {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        const payload = { model, messages, stream: true, temperature, max_tokens, top_p };

        response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`Qwen API error: ${response.status}`);
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
            const parsed = JSON.parse(line.replace(/^data:\s*/, ''));
            
            if (this.config.mode === 'ollama') {
              if (parsed.response) yield parsed.response;
              if (parsed.done) return;
            } else {
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) yield delta;
              if (parsed.choices?.[0]?.finish_reason) return;
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
   * Descarga un modelo Qwen desde Ollama
   */
  async pullModel(modelName: string): Promise<void> {
    if (!modelName.includes('qwen')) {
      console.warn('Warning: Pulling a non-Qwen model. This may not be optimized for telecom/meca tasks.');
    }

    const response = await fetch(`${this.config.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model ${modelName}: ${response.statusText}`);
    }

    this.emit('model-pulled', modelName);
    await this.connect();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Crea una instancia del proveedor Qwen con configuración por defecto
 */
export function createQwenProvider(config?: Partial<QwenConfig>): QwenProvider {
  const defaultConfig: QwenConfig = {
    baseUrl: process.env.QWEN_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434',
    apiKey: process.env.QWEN_API_KEY,
    timeout: 120000,
    maxRetries: 3,
    mode: 'ollama',
  };

  return new QwenProvider({ ...defaultConfig, ...config });
}
