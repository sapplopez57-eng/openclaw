/**
 * Agente principal para telecomunicaciones y mecatrónica
 * 
 * Integra modelos Qwen/Ollama con herramientas especializadas
 */

import { EventEmitter } from 'node:events';
import { QwenProvider, createQwenProvider, type QwenConfig, type ChatMessage } from '../models/qwen.js';
import { OllamaProvider, createOllamaProvider, type OllamaConfig } from '../models/ollama.js';
import {
  calculateLinkBudget,
  calculateAntenna,
  calculateModulation,
  calculateFSPL,
  dbmToWatts,
  wattsToDbm,
} from '../skills/telecom/rf-calculator.js';
import {
  stepResponse,
  tunePIDZieglerNichols,
  tunePIDBySpecs,
  checkStability,
  tfToStateSpace,
} from '../skills/meca/control-systems.js';

export interface AgentConfig {
  qwen?: QwenConfig;
  ollama?: OllamaConfig;
  preferredModel?: string;
  verbose?: boolean;
}

export interface ToolCall {
  name: string;
  params: Record<string, unknown>;
  result?: unknown;
}

export interface AgentResponse {
  message: string;
  toolCalls?: ToolCall[];
  model?: string;
  tokens?: number;
}

export class TelecomMecaAgent extends EventEmitter {
  private qwenProvider: QwenProvider;
  private ollamaProvider: OllamaProvider;
  private config: AgentConfig;
  private conversationHistory: ChatMessage[] = [];
  private readonly MAX_HISTORY = 20;

  constructor(config: AgentConfig) {
    super();
    this.config = {
      verbose: false,
      preferredModel: 'qwen2.5-coder:7b',
      ...config,
    };

    this.qwenProvider = createQwenProvider(config.qwen);
    this.ollamaProvider = createOllamaProvider(config.ollama);

    this.setupSystemPrompt();
  }

  private setupSystemPrompt(): void {
    this.conversationHistory = [{
      role: 'system',
      content: `Eres un asistente experto en ingeniería de telecomunicaciones y mecatrónica.
      
Tus especialidades incluyen:
- Telecomunicaciones: RF, antenas, modulación, presupuesto de enlace, propagación
- Mecatrónica: sistemas de control, PID, espacio de estados, respuesta transitoria

Puedes usar herramientas especializadas para:
- Calcular presupuestos de enlace RF
- Diseñar antenas y calcular parámetros
- Analizar esquemas de modulación (ASK, FSK, PSK, QAM, OFDM)
- Calcular respuesta al escalón de sistemas
- Sintonizar controladores PID
- Analizar estabilidad de sistemas

Siempre proporciona explicaciones claras y muestra los cálculos cuando sea relevante.`,
    }];
  }

  /**
   * Inicializa los proveedores de modelos
   */
  async initialize(): Promise<void> {
    try {
      await this.qwenProvider.connect();
      this.log('Qwen provider connected');

      await this.ollamaProvider.connect();
      this.log('Ollama provider connected');

      this.emit('ready', {
        qwenModels: this.qwenProvider.getModels().length,
        ollamaModels: this.ollamaProvider.getModels().length,
      });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Procesa una consulta del usuario
   */
  async process(query: string): Promise<AgentResponse> {
    this.log(`Processing query: ${query.substring(0, 100)}...`);

    // Añadir consulta al historial
    this.conversationHistory.push({ role: 'user', content: query });
    if (this.conversationHistory.length > this.MAX_HISTORY) {
      this.conversationHistory.shift();
    }

    // Determinar si se necesita usar herramientas
    const toolCalls: ToolCall[] = [];
    let enhancedQuery = query;

    // Detectar intenciones para usar herramientas
    if (this.needsLinkBudgetCalculation(query)) {
      const params = this.extractLinkBudgetParams(query);
      if (params) {
        const result = calculateLinkBudget(params);
        toolCalls.push({ name: 'calculateLinkBudget', params, result });
        enhancedQuery += `\n\n[Contexto: Se calculó presupuesto de enlace. Potencia recibida: ${result.receivedPower.toFixed(2)} dBm, Margen: ${result.margin.toFixed(2)} dB, Factible: ${result.feasible}]`;
      }
    }

    if (this.needsAntennaCalculation(query)) {
      const params = this.extractAntennaParams(query);
      if (params) {
        const result = calculateAntenna(params);
        toolCalls.push({ name: 'calculateAntenna', params, result });
        enhancedQuery += `\n\n[Contexto: Antena λ=${result.wavelength.toFixed(4)}m, Ganancia: ${result.gain?.toFixed(2) ?? 'N/A'} dBi]`;
      }
    }

    if (this.needsControlSystemAnalysis(query)) {
      const params = this.extractControlSystemParams(query);
      if (params && params.type === 'stepResponse') {
        const response = stepResponse(params.system, params.tFinal, params.points);
        toolCalls.push({ 
          name: 'stepResponse', 
          params: { tFinal: params.tFinal }, 
          result: {
            overshoot: response.overshoot,
            settlingTime: response.settlingTime,
            riseTime: response.riseTime,
            steadyStateValue: response.steadyStateValue,
          }
        });
        enhancedQuery += `\n\n[Contexto: Respuesta al escalón - Sobrepico: ${response.overshoot.toFixed(2)}%, Tiempo asentamiento: ${response.settlingTime.toFixed(3)}s]`;
      }
    }

    // Generar respuesta con el modelo
    const messages: ChatMessage[] = [
      ...this.conversationHistory.filter(m => m.role === 'system'),
      { role: 'user', content: enhancedQuery },
    ];

    const modelToUse = this.config.preferredModel || 'qwen2.5-coder:7b';
    
    try {
      const response = await this.qwenProvider.chat({
        model: modelToUse,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const assistantMessage = response.choices[0]?.message?.content || 'No se pudo generar una respuesta.';

      // Añadir respuesta al historial
      this.conversationHistory.push({ role: 'assistant', content: assistantMessage });

      this.log(`Generated response (${response.usage?.total_tokens || 0} tokens)`);

      return {
        message: assistantMessage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        model: modelToUse,
        tokens: response.usage?.total_tokens,
      };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Ejecuta streaming de una respuesta
   */
  async *processStream(query: string): AsyncGenerator<string> {
    this.conversationHistory.push({ role: 'user', content: query });

    const messages: ChatMessage[] = [
      ...this.conversationHistory.filter(m => m.role === 'system'),
      { role: 'user', content: query },
    ];

    const modelToUse = this.config.preferredModel || 'qwen2.5-coder:7b';
    let fullResponse = '';

    try {
      for await (const chunk of this.qwenProvider.streamChat({
        model: modelToUse,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      })) {
        fullResponse += chunk;
        yield chunk;
      }

      this.conversationHistory.push({ role: 'assistant', content: fullResponse });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Limpia el historial de conversación
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.setupSystemPrompt();
    this.log('Conversation history cleared');
  }

  /**
   * Obtiene el historial actual
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Agent] ${message}`);
    }
  }

  // Métodos de detección de intenciones (simplificados)
  private needsLinkBudgetCalculation(query: string): boolean {
    const keywords = ['presupuesto', 'enlace', 'link budget', 'potencia recibida', 'fspl', 'pérdida'];
    return keywords.some(k => query.toLowerCase().includes(k));
  }

  private extractLinkBudgetParams(query: string): any {
    // Extracción básica - en producción usaría regex más sofisticados o NLP
    const freqMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:GHz|MHz|kHz|Hz)/i);
    const powerMatch = query.match(/(\d+(?:\.\d+)?)\s*dBm/i);
    const distanceMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:km|m)/i);
    
    if (!freqMatch || !powerMatch || !distanceMatch) return null;

    let frequency = parseFloat(freqMatch[1]);
    if (freqMatch[2]?.toLowerCase().includes('ghz')) frequency *= 1e9;
    else if (freqMatch[2]?.toLowerCase().includes('mhz')) frequency *= 1e6;
    else if (freqMatch[2]?.toLowerCase().includes('khz')) frequency *= 1e3;

    let distance = parseFloat(distanceMatch[1]);
    if (distanceMatch[2]?.toLowerCase().includes('km')) distance *= 1000;

    return {
      frequency,
      txPower: parseFloat(powerMatch[1]),
      txAntennaGain: 10, // valor por defecto
      rxAntennaGain: 10, // valor por defecto
      distance,
    };
  }

  private needsAntennaCalculation(query: string): boolean {
    const keywords = ['antena', 'antenna', 'ganancia', 'gain', 'dBi', 'parabólica'];
    return keywords.some(k => query.toLowerCase().includes(k));
  }

  private extractAntennaParams(query: string): any {
    const freqMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:GHz|MHz|kHz|Hz)/i);
    const gainMatch = query.match(/(\d+(?:\.\d+)?)\s*dBi/i);
    const diameterMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:m|cm|mm)/i);
    
    if (!freqMatch) return null;

    let frequency = parseFloat(freqMatch[1]);
    if (freqMatch[2]?.toLowerCase().includes('ghz')) frequency *= 1e9;
    else if (freqMatch[2]?.toLowerCase().includes('mhz')) frequency *= 1e6;
    else if (freqMatch[2]?.toLowerCase().includes('khz')) frequency *= 1e3;

    const params: any = { frequency };
    if (gainMatch) params.gain = parseFloat(gainMatch[1]);
    if (diameterMatch) {
      params.diameter = parseFloat(diameterMatch[1]);
      if (diameterMatch[2]?.toLowerCase().includes('cm')) params.diameter /= 100;
      else if (diameterMatch[2]?.toLowerCase().includes('mm')) params.diameter /= 1000;
    }
    params.efficiency = 0.55; // valor por defecto

    return params;
  }

  private needsControlSystemAnalysis(query: string): boolean {
    const keywords = ['respuesta', 'escalón', 'step response', 'sobrepico', 'overshoot', 'pid', 'estabilidad'];
    return keywords.some(k => query.toLowerCase().includes(k));
  }

  private extractControlSystemParams(query: string): any {
    // Para sistemas simples de segundo orden
    const wnMatch = query.match(/ωn\s*=\s*(\d+(?:\.\d+)?)/i);
    const zetaMatch = query.match(/ζ\s*=\s*(\d+(?:\.\d+)?)/i);
    
    if (wnMatch && zetaMatch) {
      const wn = parseFloat(wnMatch[1]);
      const zeta = parseFloat(zetaMatch[1]);
      
      // Función de transferencia de segundo orden: G(s) = ωn² / (s² + 2ζωn s + ωn²)
      return {
        type: 'stepResponse',
        system: {
          numerator: [wn * wn],
          denominator: [1, 2 * zeta * wn, wn * wn],
        },
        tFinal: 10,
        points: 1000,
      };
    }
    
    return null;
  }
}

/**
 * Crea una instancia del agente con configuración por defecto
 */
export function createAgent(config?: Partial<AgentConfig>): TelecomMecaAgent {
  return new TelecomMecaAgent({
    ...config,
    qwen: {
      baseUrl: process.env.QWEN_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434',
      mode: 'ollama',
      ...config?.qwen,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
      ...config?.ollama,
    },
  });
}
