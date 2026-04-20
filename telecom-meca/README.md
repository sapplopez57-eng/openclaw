# Telecom-Meca Agent

Asistente de IA especializado en **Telecomunicaciones** y **Mecatrónica** con Qwen y Ollama. Funciona 100% local sin dependencias de APIs externas.

## 🚀 Características

- ✅ **Totalmente local**: Usa Qwen y Ollama como base, sin APIs externas
- ✅ **Especializado en telecomunicaciones**: RF, antenas, modulación, presupuesto de enlace
- ✅ **Especializado en mecatrónica**: Sistemas de control, PID, espacio de estados
- ✅ **Interfaz web nativa**: UI moderna y responsive incluida
- ✅ **Integración con Telegram**: Bot opcional para recibir consultas
- ✅ **Herramientas especializadas**: Cálculos automáticos de parámetros técnicos
- ✅ **Streaming de respuestas**: Respuestas en tiempo real

## 📋 Requisitos Previos

1. **Node.js >= 22.0.0**
2. **Ollama instalado** ([Descargar](https://ollama.ai))
3. **Modelos Qwen descargados** (ver sección de instalación)

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
cd /workspace/telecom-meca
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Descargar modelos con Ollama

```bash
# Modelo principal recomendado
ollama pull qwen2.5-coder:7b

# Modelos alternativos
ollama pull qwen2.5:7b
ollama pull llama3.2:3b
ollama pull mistral:7b
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y configurar:

```bash
# Configuración de Ollama
OLLAMA_HOST=http://localhost:11434

# Puerto del servidor
PORT=8080

# Token de Telegram (opcional)
TELEGRAM_BOT_TOKEN=tu_token_aqui

# Usuarios permitidos (opcional)
TELEGRAM_ALLOWED_USERS=123456789,987654321
```

## 🚀 Uso

### Iniciar servidor con UI web

```bash
npm run server
```

Acceder a: **http://localhost:8080**

### Usar solo CLI

```bash
npm run dev
```

### Construir para producción

```bash
npm run build
npm run server:build
```

## 📡 Integración con Telegram

1. Crea un bot con [@BotFather](https://t.me/BotFather) en Telegram
2. Copia el token que te proporciona
3. Añádelo a tu archivo `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

4. Reinicia el servidor

El bot responderá automáticamente a los mensajes.

## 🧮 Herramientas Disponibles

### Telecomunicaciones

- **Presupuesto de enlace**: Calcula potencia recibida, pérdida en espacio libre, margen del sistema
- **Diseño de antenas**: Ganancia, beamwidth, área efectiva, longitud de onda
- **Modulación**: Parámetros para ASK, FSK, PSK, QAM, OFDM
- **Capacidad de Shannon**: Cálculo de capacidad máxima del canal
- **BER (Bit Error Rate)**: Tasa de error para diferentes esquemas
- **Conversión de unidades**: dBm ↔ Watts, impedancia característica

### Mecatrónica

- **Respuesta al escalón**: Sobrepico, tiempo de asentamiento, tiempo de subida
- **Sintonización PID**: Método Ziegler-Nichols, sintonización por especificaciones
- **Análisis de estabilidad**: Cálculo de polos, criterio de Routh-Hurwitz
- **Espacio de estados**: Conversión TF ↔ Espacio de estados

## 💻 Ejemplos de Uso

### Desde la Web UI

Simplemente escribe tus consultas en la interfaz web:

- "Calcula el presupuesto de enlace para 2.4 GHz, 20 dBm, 5 km"
- "Diseña una antena parabólica para 10 GHz con 30 dBi"
- "Calcula la respuesta al escalón de un sistema con ωn=5 y ζ=0.3"
- "Sintoniza un PID con Ziegler-Nichols para Ku=2.5 y Tu=1.2s"

### Desde Telegram

Envía mensajes directamente al bot con las mismas consultas.

### Desde la API

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Calcula FSPL para 2.4 GHz a 100m"}'
```

## 📁 Estructura del Proyecto

```
telecom-meca/
├── src/
│   ├── channels/         # Canales de comunicación (Telegram)
│   │   └── telegram.ts
│   ├── core/             # Lógica principal del agente
│   │   └── agent.ts
│   ├── models/           # Proveedores de modelos (Qwen, Ollama)
│   │   ├── ollama.ts
│   │   └── qwen.ts
│   ├── skills/           # Habilidades especializadas
│   │   ├── telecom/      # Telecomunicaciones
│   │   │   └── rf-calculator.ts
│   │   └── meca/         # Mecatrónica
│   │       └── control-systems.ts
│   ├── server.ts         # Servidor principal
│   └── cli.ts            # Interfaz de línea de comandos
├── public/               # Archivos estáticos (UI web)
│   └── index.html
├── scripts/              # Scripts utilitarios
├── tests/                # Pruebas unitarias
└── package.json
```

## 🔧 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run server` | Inicia servidor con UI web |
| `npm run dev` | Inicia CLI interactiva |
| `npm run build` | Compila TypeScript a JavaScript |
| `npm run server:build` | Inicia servidor desde build |
| `npm run models:pull` | Descarga modelos recomendados |
| `npm run models:list` | Lista modelos disponibles |
| `npm test` | Ejecuta pruebas unitarias |

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-habilidad`)
3. Commit tus cambios (`git commit -am 'Añade nueva habilidad'`)
4. Push (`git push origin feature/nueva-habilidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Para issues o preguntas, abre un issue en GitHub.

---

**Hecho con ❤️ para ingenieros en telecomunicaciones y mecatrónica**
