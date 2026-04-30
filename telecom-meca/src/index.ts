/**
 * Telecom-Meca Agent
 * 
 * Asistente de IA especializado en Telecomunicaciones y Mecatrónica
 * con ejecución local usando Qwen y Ollama
 */

// Modelos
export {
  createQwenProvider,
  QwenProvider,
  type QwenConfig,
  type QwenModel,
  type ChatMessage,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
} from './models/qwen.js';

export {
  createOllamaProvider,
  OllamaProvider,
  type OllamaConfig,
  type OllamaModel,
  type CompletionRequest,
  type CompletionResponse,
} from './models/ollama.js';

// Agente
export {
  createAgent,
  TelecomMecaAgent,
  type AgentConfig,
  type AgentResponse,
  type ToolCall,
} from './core/agent.js';

// Herramientas de Telecomunicaciones
export {
  calculateLinkBudget,
  calculateAntenna,
  calculateModulation,
  calculateFSPL,
  dbmToWatts,
  wattsToDbm,
  dbToRatio,
  ratioToDb,
  calculateWaveguideCutoff,
  calculateCharacteristicImpedance,
  type LinkBudgetParams,
  type LinkBudgetResult,
  type AntennaParams,
  type AntennaResult,
  type ModulationParams,
  type ModulationResult,
} from './skills/telecom/rf-calculator.js';

// Herramientas de Mecatrónica
export {
  tfToStateSpace,
  stepResponse,
  tunePIDZieglerNichols,
  tunePIDBySpecs,
  checkStability,
  stateSpaceToTF,
  calculatePoles,
  type TransferFunction,
  type PIDParams,
  type PIDTuningSpec,
  type StateSpace,
  type StepResponse,
  type PIDTuningResult,
} from './skills/meca/control-systems.js';
