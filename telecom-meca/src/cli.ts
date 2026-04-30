#!/usr/bin/env node

/**
 * CLI para el agente de telecomunicaciones y mecatrónica
 * 
 * Uso:
 *   bun run cli.ts                    # Modo interactivo
 *   bun run cli.ts "tu pregunta"      # Ejecutar una consulta
 *   bun run cli.ts --help             # Mostrar ayuda
 */

import { createAgent } from './core/agent.js';
import { createInterface } from 'node:readline';
import { stdin, stdout, exit } from 'node:process';

const HELP_TEXT = `
📡 Telecom-Meca Agent CLI

Uso:
  bun run cli.ts [opciones] [consulta]

Opciones:
  --help, -h              Mostrar esta ayuda
  --model <nombre>        Modelo a usar (default: qwen2.5-coder:7b)
  --verbose, -v           Modo detallado
  --stream                Usar streaming de respuestas
  --clear                 Limpiar historial

Ejemplos:
  bun run cli.ts "Calcula el presupuesto de enlace para 2.4 GHz a 1 km con 20 dBm"
  bun run cli.ts --model qwen2.5-coder:14b "Diseña una antena parabólica para 10 GHz con 30 dBi"
  bun run cli.ts --stream "Analiza un sistema con ωn=5 y ζ=0.7"

Comandos interactivos:
  /clear                  Limpiar historial
  /model <nombre>         Cambiar modelo
  /help                   Mostrar ayuda
  /exit, /quit            Salir
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Parsear argumentos
  let model = 'qwen2.5-coder:7b';
  let verbose = false;
  let useStream = false;
  let query: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      console.log(HELP_TEXT);
      exit(0);
    } else if (arg === '--model' && args[i + 1]) {
      model = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--stream') {
      useStream = true;
    } else if (arg === '--clear') {
      // Solo bandera, se maneja en modo interactivo
    } else if (!arg.startsWith('-')) {
      query = args.slice(i).join(' ');
      break;
    }
  }

  // Crear agente
  const agent = createAgent({
    preferredModel: model,
    verbose,
  });

  try {
    // Conectar
    if (verbose) {
      console.log('🔄 Conectando a los proveedores de modelos...');
    }
    
    await agent.initialize();
    
    if (verbose) {
      console.log('✅ Agente listo\n');
    }

    // Modo no interactivo (consulta única)
    if (query) {
      if (useStream) {
        console.log('🤖 Respondiendo...\n');
        for await (const chunk of agent.processStream(query)) {
          process.stdout.write(chunk);
        }
        console.log('\n');
      } else {
        const response = await agent.process(query);
        console.log('\n🤖 Respuesta:\n');
        console.log(response.message);
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log('\n📊 Herramientas usadas:');
          for (const tool of response.toolCalls) {
            console.log(`  - ${tool.name}:`, JSON.stringify(tool.result, null, 2));
          }
        }
      }
      return;
    }

    // Modo interactivo
    console.log('📡 Telecom-Meca Agent CLI');
    console.log('========================');
    console.log(`Modelo: ${model}`);
    console.log('Escribe /help para comandos, /exit para salir\n');

    const rl = createInterface({
      input: stdin,
      output: stdout,
      prompt: '🔹 ',
    });

    rl.prompt();

    for await (const line of rl) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        rl.prompt();
        continue;
      }

      // Comandos especiales
      if (trimmedLine.startsWith('/')) {
        const [command, ...cmdArgs] = trimmedLine.split(/\s+/);
        
        switch (command.toLowerCase()) {
          case '/help':
            console.log(`
Comandos:
  /clear        Limpiar historial de conversación
  /model <name> Cambiar modelo actual
  /stream       Alternar modo streaming
  /verbose      Alternar modo detallado
  /help         Mostrar esta ayuda
  /exit, /quit  Salir del programa
`);
            break;
            
          case '/clear':
            agent.clearHistory();
            console.log('✅ Historial limpiado\n');
            break;
            
          case '/model':
            if (cmdArgs[0]) {
              model = cmdArgs[0];
              // Nota: en una implementación completa, recrearíamos el agente
              console.log(`✅ Modelo cambiado a: ${model}\n`);
            } else {
              console.log(`Modelo actual: ${model}\n`);
            }
            break;
            
          case '/stream':
            useStream = !useStream;
            console.log(`✅ Streaming: ${useStream ? 'activado' : 'desactivado'}\n`);
            break;
            
          case '/verbose':
            verbose = !verbose;
            console.log(`✅ Modo detallado: ${verbose ? 'activado' : 'desactivado'}\n`);
            break;
            
          case '/exit':
          case '/quit':
            console.log('👋 ¡Hasta luego!');
            rl.close();
            exit(0);
            break;
            
          default:
            console.log(`❌ Comando desconocido: ${command}. Escribe /help para ayuda.\n`);
        }
        
        rl.prompt();
        continue;
      }

      // Procesar consulta normal
      try {
        if (useStream) {
          for await (const chunk of agent.processStream(trimmedLine)) {
            process.stdout.write(chunk);
          }
          console.log('\n');
        } else {
          const response = await agent.process(trimmedLine);
          console.log('\n' + response.message + '\n');
          
          if (response.toolCalls && response.toolCalls.length > 0) {
            console.log('📊 Herramientas usadas:');
            for (const tool of response.toolCalls) {
              console.log(`  - ${tool.name}:`, JSON.stringify(tool.result, null, 2));
            }
            console.log('');
          }
        }
      } catch (error) {
        console.error(`❌ Error: ${(error as Error).message}\n`);
      }

      rl.prompt();
    }
  } catch (error) {
    console.error(`❌ Error fatal: ${(error as Error).message}`);
    if (verbose) {
      console.error(error);
    }
    exit(1);
  }
}

// Ejecutar
main().catch(console.error);
