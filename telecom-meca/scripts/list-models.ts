#!/usr/bin/env node

/**
 * Script para listar modelos disponibles
 */

import { createOllamaProvider } from '../src/models/ollama.js';
import { createQwenProvider } from '../src/models/qwen.js';

async function main(): Promise<void> {
  console.log('📋 Modelos Disponibles\n');
  console.log('=====================\n');
  
  // Ollama
  const ollamaProvider = createOllamaProvider();
  
  try {
    await ollamaProvider.connect();
    const ollamaModels = ollamaProvider.getModels();
    
    console.log('🦙 Ollama:');
    if (ollamaModels.length === 0) {
      console.log('   No hay modelos instalados. Ejecuta: bun run models:pull\n');
    } else {
      for (const model of ollamaModels) {
        const qwenBadge = model.id.includes('qwen') ? ' [Qwen]' : '';
        console.log(`   - ${model.name}${qwenBadge} (context: ${model.contextWindow})`);
      }
      console.log('');
    }
  } catch (error) {
    console.log('   ❌ Ollama no está disponible. Asegúrate de ejecutar: ollama serve\n');
  }
  
  // Qwen recomendados
  const qwenProvider = createQwenProvider();
  const recommendedModels = qwenProvider.getRecommendedModels();
  
  console.log('🤖 Qwen Recomendados para Telecom/Meca:');
  for (const model of recommendedModels) {
    const badges = [];
    if (model.reasoning) badges.push('[Razonamiento]');
    if (model.multimodal) badges.push('[Multimodal]');
    if (model.id.includes('coder')) badges.push('[Coding]');
    if (model.id.includes('math')) badges.push('[Math]');
    
    console.log(`   - ${model.name} ${badges.join(' ')}`);
  }
  console.log('');
  
  console.log('💡 Tip: Usa --model <nombre> para seleccionar un modelo específico\n');
}

main().catch(console.error);
