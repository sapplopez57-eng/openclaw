# 🧬 Integración Clawdbot + Genesyx

## Visión General

Integrar el **kernel emocional bioquímico** y la **memoria vectorial** de Genesyx en Clawdbot, sin dependencia de APIs externas.

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                      CLAWDBOT                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Canales    │  │   Skills     │  │   Plugins    │       │
│  │  WhatsApp    │  │  clawdhub    │  │   Voice      │       │
│  │  Discord     │  │  genesyx ←───┼───► Kernel     │       │
│  │  Telegram    │  │              │  │   Emocional  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GENESYX CORE                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Neurotrans-  │  │ Memoria      │  │  Tareas      │       │
│  │ misores (7)  │  │ Vectorial    │  │ Programadas  │       │
│  │              │  │ SQLite+FTS5  │  │  (cron/at)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  LLM: Ollama Local (qwen2.5, neural-chat)                   │
│  Zero API Keys requeridas                                   │
└─────────────────────────────────────────────────────────────┘
```

## Componentes a Integrar

### 1. Kernel Emocional Bioquímico

**Ubicación:** `src/agents/emotional-kernel.ts`

**Funcionalidad:**
- 7 neurotransmisores: dopamina, oxitocina, cortisol, serotonina, noradrenalina, gaba, endorfinas
- 6 estados emergentes: reflexiva_contemplativa, segura_directa, vulnerable_intima, melancolica_nostalgica, alerta_analitica, serena_presente
- Evolución continua basada en interacciones
- Modificación del tono de respuesta según estado emocional

**Beneficios:**
- Respuestas más humanas y contextuales
- Memoria emocional de conversaciones
- Personalidad consistente que evoluciona

### 2. Memoria Vectorial con Búsqueda O(1)

**Ubicación:** `src/memory/genesyx-db.ts`

**Funcionalidad:**
- Índice invertido sobre SQLite FTS5
- Caché de embeddings
- Write-Ahead Log con recovery automático
- Búsquedas semánticas rápidas

**Beneficios:**
- Recuperación de contexto más rápida
- Menor uso de tokens en prompts
- Historial persistente eficiente

### 3. Gateway de Comunicación TypeScript ↔ Python

**Opción A: Puente RPC**
```bash
# Archivos a crear:
skills/genesyx-kernel/
├── SKILL.md
├── genesyx-bridge.ts      # Lado TypeScript
├── genesyx-worker.py      # Lado Python
└── config.json
```

**Opción B: Porting Puro a TypeScript**
- Reimplementar el kernel emocional en TS
- Reutilizar lógica de memoria vectorial
- Zero dependencias de Python

## Setup Sin API

### Configuración Recomendada

```bash
# 1. Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull de modelos locales
ollama pull qwen2.5:7b
ollama pull neural-chat

# 3. Configurar Clawdbot
export CLAWDBOT_LLM_PROVIDER=ollama
export CLAWDBOT_LLM_MODEL=qwen2.5:7b

# 4. Activar kernel emocional
export CLAWDBOT_EMOTIONAL_KERNEL=true
```

### Variables de Entorno

```bash
# Opcional: API keys para fallback (no requeridas)
# export GROQ_API_KEY=""        # Si quieres Groq como fallback
# export DASHSCOPE_API_KEY=""   # Si quieres GLM 4.5 oficial

# Requerido: Nada si usas solo Ollama local
```

## Roadmap de Implementación

### Fase 1: Kernel Emocional (1-2 días)
- [ ] Crear `src/agents/emotional-kernel.ts`
- [ ] Implementar 7 neurotransmisores
- [ ] Integrar con sistema de identidad de Clawdbot
- [ ] Tests unitarios

### Fase 2: Memoria Vectorial (2-3 días)
- [ ] Crear `src/memory/genesyx-db.ts`
- [ ] Implementar índice invertido SQLite FTS5
- [ ] Migrar datos existentes de memoria
- [ ] Optimizar búsquedas

### Fase 3: Integración Completa (3-5 días)
- [ ] Conectar kernel emocional con generación de respuestas
- [ ] Integrar tareas programadas
- [ ] Documentación completa
- [ ] Skills de ejemplo

## Comandos de Uso

```bash
# Ver estado emocional actual
clawdbot emotional-status

# Resetear estado emocional
clawdbot emotional-reset

# Programar tarea estilo Genesyx
clawdbot schedule "recordatorio" --in "5 minutes"

# Buscar en memoria vectorial
clawdbot memory-search "conversación sobre proteínas"
```

## Referencias

- Genesyx original: `/workspace/genesyx/genesyx_glm4.5_alibaba.py`
- Sistema de skills: `/workspace/docs/cli/skills.md`
- Memoria actual: `/workspace/src/agents/memory-search.ts`

## Notas Importantes

1. **Zero API Dependency**: Todo funciona con Ollama local
2. **Backward Compatible**: No rompe funcionalidad existente
3. **Progressive Enhancement**: Se activa opcionalmente
4. **Performance**: Búsquedas O(1) vs O(n) actuales
