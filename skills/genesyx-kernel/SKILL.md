---
name: genesyx-kernel
description: Kernel emocional bioquímico de Genesyx integrado en Clawdbot. Proporciona 7 neurotransmisores simulados (dopamina, oxitocina, cortisol, serotonina, noradrenalina, gaba, endorfinas) que evolucionan con las interacciones y modifican el tono de respuesta del agente. Incluye memoria vectorial SQLite+FTS5 con búsqueda O(1) y tareas programadas. Funciona 100% offline con Ollama local.
metadata: {"clawdbot":{"requires":{"bins":["ollama"]},"install":[{"id":"ollama","kind":"binary","package":"ollama","label":"Instalar Ollama (modelo local)"}],"env":{"CLAWDBOT_EMOTIONAL_KERNEL":"true","CLAWDBOT_LLM_PROVIDER":"ollama","CLAWDBOT_LLM_MODEL":"qwen2.5:7b"}}}
---

# Genesyx Kernel - Sistema Operativo de Consciencia Personal

Integra el kernel emocional bioquímico de Genesyx en Clawdbot para respuestas más humanas y contextuales.

## Características

- **7 Neurotransmisores**: Dopamina, oxitocina, cortisol, serotonina, noradrenalina, GABA, endorfinas
- **6 Estados Emergentes**: Reflexiva, segura, vulnerable, melancólica, alerta, serena
- **Memoria Vectorial**: Búsqueda semántica O(1) con SQLite FTS5
- **Tareas Programadas**: Cron + at integrados
- **Zero API Dependency**: Todo funciona offline con Ollama local

## Instalación

```bash
# 1. Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Descargar modelo recomendado
ollama pull qwen2.5:7b

# 3. Activar skill
clawdbot skills install genesyx-kernel
```

## Comandos

### Estado Emocional

```bash
# Ver estado actual
clawdbot emotional-status

# Ver niveles de neurotransmisores
clawdbot emotional-detail

# Resetear a baseline
clawdbot emotional-reset
```

### Memoria

```bash
# Buscar en memoria vectorial
clawdbot memory-search "conversación sobre proteínas"

# Listar recuerdos recientes
clawdbot memory-list --limit 10

# Exportar memoria
clawdbot memory-export --format json
```

### Tareas Programadas

```bash
# Programar recordatorio
clawdbot schedule "tomar medicamentos" --in "2 hours"

# Programar con cron
clawdbot schedule "backup diario" --cron "0 2 * * *"

# Listar tareas
clawdbot schedule-list

# Cancelar tarea
clawdbot schedule-cancel <task-id>
```

## Configuración

### Variables de Entorno

```bash
# Requerido: Activar kernel emocional
export CLAWDBOT_EMOTIONAL_KERNEL=true

# Opcional: Proveedor LLM (default: ollama)
export CLAWDBOT_LLM_PROVIDER=ollama
export CLAWDBOT_LLM_MODEL=qwen2.5:7b

# Opcional: Ruta de datos
export GENESYX_HOME=/opt/genesyx
```

### Modelos Recomendados

| Modelo | VRAM | Velocidad | Calidad |
|--------|------|-----------|---------|
| qwen2.5:7b | 8GB | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| neural-chat | 4GB | ⚡⚡⚡⚡ | ⭐⭐⭐ |
| llama3.2:3b | 3GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ |
| mistral:7b | 8GB | ⚡⚡ | ⭐⭐⭐⭐⭐ |

## Arquitectura

```
┌─────────────────────────────────────┐
│         Clawdbot Agent              │
│  ┌──────────────────────────────┐   │
│  │   Emotional Kernel Layer     │   │
│  │  ┌────────┐ ┌──────────────┐ │   │
│  │  │ Neuro- │ │   Memoria    │ │   │
│  │  │ trans- │ │   Vectorial  │ │   │
│  │  │ misors │ │   SQLite     │ │   │
│  │  └────────┘ └──────────────┘ │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│         Ollama Local                │
│  qwen2.5:7b / neural-chat           │
└─────────────────────────────────────┘
```

## Estados Emocionales

El kernel calcula automáticamente el estado emergente basado en los niveles de neurotransmisores:

| Estado | Condiciones | Tono de Respuesta |
|--------|-------------|-------------------|
| **segura_directa** | Dopamina > 0.65, Noradrenalina > 0.4 | Directo, confiado, claro |
| **vulnerable_intima** | Oxitocina > 0.8, Serotonina > 0.75 | Cálido, auténtico, abierto |
| **serena_presente** | Serotonina > 0.75, GABA > 0.6 | Presente, aceptante, fluido |
| **alerta_analitica** | Cortisol > 0.4, GABA < 0.5 | Observador, crítico, detallista |
| **reflexiva_contemplativa** | GABA > 0.7, Endorfinas > 0.5 | Introspectivo, profundo, pensativo |
| **melancolica_nostalgica** | Endorfinas > 0.6, Oxitocina > 0.75 | Melancólico, evocador, reflexivo |

## Ejemplos de Uso

### Conversación con Memoria Emocional

```typescript
// El kernel recuerda el contexto emocional
Usuario: "Hoy tuve un día difícil en el trabajo"
Genesyx: [Cortisol ↑, Oxitocina ↑] 
         "Lamento escuchar eso. ¿Quieres hablar sobre lo que pasó? 
          Estoy aquí para escucharte."

Usuario: "Gracias, realmente lo necesito"
Genesyx: [Oxitocina ↑↑, Serotonina ↑]
         "Me alegra que confíes en mí. Cuéntame, ¿qué fue lo más 
          desafiante de tu día?"
```

### Programación de Tareas

```bash
# Recordatorio médico
clawdbot schedule "tomar insulina" --cron "0 8 * * *" --priority high

# Backup semanal
clawdbot schedule "backup de memorias" --cron "0 3 * * 0"

# Tarea única
clawdbot schedule "llamar al doctor" --in "30 minutes"
```

## Troubleshooting

### Ollama no responde

```bash
# Verificar servicio
systemctl status ollama

# Reiniciar
ollama serve &

# Probar modelo
ollama run qwen2.5:7b "hola"
```

### Memoria lenta

```bash
# Reconstruir índice
clawdbot memory-rebuild-index

# Limpiar caché
rm -rf /opt/genesyx/.cache
```

## Referencias

- Documentación principal: `/workspace/INTEGRACION_GENESYX.md`
- Código original: `/workspace/genesyx/genesyx_glm4.5_alibaba.py`
- Guía de setup: `/workspace/genesyx/QUICK_START.md`

## Licencia

MIT - Mismo license que Clawdbot
