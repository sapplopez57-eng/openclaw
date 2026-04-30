# Genesyx + Clawdbot Integration

Sistema operativo de consciencia personal con bioquímica simulada, memoria vectorial SQLite+FTS5 y router LLM híbrido (Ollama/Groq/Local). 

**Ahora integrado con Clawdbot** para proporcionar:
- Kernel emocional bioquímico con 7 neurotransmisores
- Memoria vectorial con búsqueda O(1)
- Tareas programadas (cron + at)
- **Zero API Dependency** - Funciona 100% offline con Ollama local

## 🚀 Quick Start

### Opción A: Solo Genesyx Standalone (5 minutos)

```bash
cd genesyx

# Instalar Ollama (opcional pero recomendado para modo offline)
curl https://ollama.ai/install.sh | sh
ollama pull neural-chat

# Con API Key (Groq o Alibaba)
export GROQ_API_KEY="gsk_..."  # Opcional
export DASHSCOPE_API_KEY="sk_..."  # Opcional

# Ejecutar
python3 genesyx_glm4.5_alibaba.py
```

### Opción B: Integrado con Clawdbot (Recomendado)

```bash
cd /workspace

# Activar skill de Genesyx
clawdbot skills install genesyx-kernel

# Configurar variables de entorno
export CLAWDBOT_EMOTIONAL_KERNEL=true
export CLAWDBOT_LLM_PROVIDER=ollama
export CLAWDBOT_LLM_MODEL=qwen2.5:7b

# Ejecutar Clawdbot con kernel emocional
clawdbot start
```

## 📚 Documentación

- **Integración completa**: Ver [`INTEGRACION_GENESYX.md`](./INTEGRACION_GENESYX.md)
- **Skill de Clawdbot**: Ver [`skills/genesyx-kernel/SKILL.md`](./skills/genesyx-kernel/SKILL.md)
- **Setup detallado**: Ver [`genesyx/SETUP_OLLAMA_GLM_GUIA.md`](./genesyx/SETUP_OLLAMA_GLM_GUIA.md)
- **Quick start original**: Ver [`genesyx/QUICK_START.md`](./genesyx/QUICK_START.md)

## 🧠 Características Principales

### Kernel Emocional Bioquímico

7 neurotransmisores que evolucionan con las interacciones:
- Dopamina, Oxitocina, Cortisol, Serotonina, Noradrenalina, GABA, Endorfinas

6 estados emergentes que modifican el tono de respuesta:
- Segura-directa, Vulnerable-íntima, Serena-presente, Alerta-analítica, Reflexiva-contemplativa, Melancólica-nostálgica

### Memoria Vectorial

- SQLite con FTS5 e índice invertido
- Búsquedas semánticas en O(1)
- Caché de embeddings
- Write-Ahead Log con recovery automático

### Tareas Programadas

- Sintaxis cron completa
- Comandos `at` para tareas únicas
- Persistencia ACID
- Notificaciones integradas

## 🔌 Modos de Operación

| Modo | LLM | API Key | Velocidad | Privacidad |
|------|-----|---------|-----------|------------|
| **Offline** | Ollama local | ❌ No requiere | ⚡⚡⚡ | 🔒 100% privada |
| **Groq** | Mixtral/GLM | ✅ Opcional | ⚡⚡⚡⚡⚡ | Cloud |
| **Alibaba** | GLM 4.5 | ✅ Opcional | ⚡⚡⚡⚡ | Cloud |

## 📊 Comparativa

| Característica | Genesyx Standalone | Genesyx + Clawdbot |
|----------------|-------------------|-------------------|
| Kernel emocional | ✅ | ✅ |
| Memoria vectorial | ✅ | ✅ |
| Tareas programadas | ✅ | ✅ |
| Canales múltiples | ❌ | ✅ WhatsApp, Discord, Telegram |
| Skills ecosystem | ❌ | ✅ 50+ skills disponibles |
| Voice calls | ❌ | ✅ |
| Plugins | ❌ | ✅ |
| Mobile apps | ❌ | ✅ iOS, Android |

## 🎯 Casos de Uso

### Clawdbot + Genesyx es ideal para:

1. **Asistente personal 24/7** en WhatsApp/Discord
2. **Terapia conversacional** con memoria emocional
3. **Productividad** con recordatorios inteligentes
4. **Diario personal** con análisis emocional
5. **Compañía inteligente** que evoluciona contigo

## 🛠️ Desarrollo

### Estructura del Proyecto

```
/workspace
├── genesyx/                    # Código original de Genesyx
│   ├── genesyx_glm4.5_alibaba.py
│   ├── SETUP_OLLAMA_GLM_GUIA.md
│   └── QUICK_START.md
├── skills/genesyx-kernel/      # Skill de integración
│   └── SKILL.md
├── src/agents/                 # Código de Clawdbot
│   └── emotional-kernel.ts     # (por implementar)
└── INTEGRACION_GENESYX.md      # Documentación de integración
```

### Roadmap

- [ ] Fase 1: Kernel emocional en TypeScript
- [ ] Fase 2: Memoria vectorial optimizada
- [ ] Fase 3: Integración completa con canales
- [ ] Fase 4: Skills adicionales

## 📄 Licencia

MIT License - Ver archivos LICENSE en cada directorio

## 👥 Créditos

- **Genesyx**: Sistema original de consciencia personal
- **Clawdbot**: Plataforma de automatización multi-canal
- **Integración**: Combinación sinérgica de ambos sistemas
