#!/usr/bin/env node

/**
 * Script para descargar modelos Qwen recomendados
 */

import { createOllamaProvider } from '../src/models/ollama.js';

const RECOMMENDED_MODELS = [
  'qwen2.5-coder:7b',    // Coding y razonamiento general
  'qwen2.5-coder:14b',   // Mejor razonamiento (si hay RAM)
  'qwen2.5:7b',          // Chat general
  'qwen2.5-math:7b',     // Matemáticas avanzadas
];

async function main(): Promise<void> {
  console.log('📥 Descargando modelos Qwen recomendados...\n');
  
  const provider = createOllamaProvider();
  
  try {
    await provider.connect();
    console.log('✅ Conectado a Ollama\n');
    
    for (const modelName of RECOMMENDED_MODELS) {
      console.log(`⏳ Descargando ${modelName}...`);
      
      try {
        await provider.pullModel(modelName);
        console.log(`✅ ${modelName} listo\n`);
      } catch (error) {
        console.error(`❌ Error descargando ${modelName}: ${(error as Error).message}\n`);
      }
    }
    
    console.log('🎉 Modelos instalados. Ejecuta: bun run dev\n');
  } catch (error) {
    console.error('❌ Error conectando a Ollama:', (error as Error).message);
    console.error('\nAsegúrate de tener Ollama instalado y ejecutándose:');
    console.error('  1. Instala Ollama: https://ollama.ai');
    console.error('  2. Ejecuta: ollama serve');
    process.exit(1);
  }
}

main().catch(console.error);
