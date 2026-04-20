# Telecom-Meca Agent

📡 Asistente de IA especializado en **Telecomunicaciones** y **Mecatrónica** con ejecución local usando **Qwen** y **Ollama**.

## ✨ Características

- 🚀 **100% Local** - Sin dependencias de APIs externas
- 🤖 **Modelos Abiertos** - Basado en Qwen y Ollama
- 📡 **Especializado en Telecom** - RF, antenas, modulación, presupuesto de enlace
- ⚙️ **Especializado en Mecatrónica** - Sistemas de control, PID, espacio de estados
- 💻 **CLI Interactiva** - Modo interactivo y consultas únicas
- 🔧 **Herramientas Integradas** - Cálculos automáticos mientras chateas

## 📦 Requisitos

1. **Node.js 22+** o **Bun**
2. **Ollama** instalado y ejecutándose

### Instalar Ollama

```bash
# Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Descarga desde: https://ollama.ai/download

# Iniciar el servidor
ollama serve
```

## 🚀 Instalación

```bash
# Clonar repositorio
cd telecom-meca

# Instalar dependencias
bun install
# o
npm install

# Descargar modelos recomendados
bun run models:pull
```

## 📖 Uso

### Modo Interactivo

```bash
bun run dev
# o
bun run src/cli.ts
```

### Consulta Única

```bash
# Calcular presupuesto de enlace
bun run dev "Calcula el presupuesto de enlace para 2.4 GHz a 1 km con 20 dBm"

# Diseñar antena
bun run dev --model qwen2.5-coder:14b "Diseña una antena parabólica para 10 GHz con 30 dBi"

# Análisis de sistemas de control
bun run dev --stream "Analiza un sistema de segundo orden con ωn=5 y ζ=0.7"
```

### Opciones de CLI

```
--help, -h              Mostrar ayuda
--model <nombre>        Modelo a usar (default: qwen2.5-coder:7b)
--verbose, -v           Modo detallado
--stream                Usar streaming de respuestas
```

### Comandos Interactivos

```
/clear          Limpiar historial
/model <name>   Cambiar modelo
/stream         Alternar modo streaming
/verbose        Alternar modo detallado
/help           Mostrar ayuda
/exit           Salir
```

## 🛠️ Herramientas Especializadas

### Telecomunicaciones

- **Presupuesto de Enlace** - Cálculo de FSPL, potencia recibida, margen
- **Diseño de Antenas** - Ganancia, beamwidth, área efectiva
- **Modulación** - ASK, FSK, PSK, QAM, OFDM
- **Capacidad de Shannon** - Límite teórico del canal
- **BER** - Tasa de error de bits
- **Líneas de Transmisión** - Impedancia característica

### Mecatrónica

- **Funciones de Transferencia** - Conversión TF ↔ Espacio de estados
- **Respuesta al Escalón** - Sobrepico, tiempo de asentamiento, tiempo de subida
- **Sintonización PID** - Ziegler-Nichols y por especificaciones
- **Análisis de Estabilidad** - Criterio de Routh-Hurwitz
- **Cálculo de Polos** - Para sistemas de segundo orden

## 🤖 Modelos Recomendados

| Modelo | Uso | RAM Mínima |
|--------|-----|------------|
| `qwen2.5-coder:7b` | Coding y razonamiento general | 8 GB |
| `qwen2.5-coder:14b` | Mejor razonamiento | 16 GB |
| `qwen2.5:7b` | Chat general | 8 GB |
| `qwen2.5-math:7b` | Matemáticas avanzadas | 8 GB |
| `qwen2.5-vl:7b` | Visión (diagramas, esquemas) | 8 GB |

## 📁 Estructura del Proyecto

```
telecom-meca/
├── src/
│   ├── models/
│   │   ├── ollama.ts      # Proveedor Ollama
│   │   ├── qwen.ts        # Proveedor Qwen
│   │   └── index.ts       # Exportaciones
│   ├── skills/
│   │   ├── telecom/
│   │   │   └── rf-calculator.ts    # Herramientas RF
│   │   └── meca/
│   │       └── control-systems.ts  # Sistemas de control
│   ├── core/
│   │   └── agent.ts       # Agente principal
│   └── cli.ts             # CLI interactiva
├── scripts/
│   ├── pull-models.ts     # Descargar modelos
│   └── list-models.ts     # Listar modelos
├── package.json
└── README.md
```

## 🔧 Desarrollo

```bash
# Modo desarrollo (con hot-reload)
bun run dev

# Compilar
bun run build

# Ejecutar tests
bun run test

# Tests específicos
bun run test:telecom    # Telecomunicaciones
bun run test:meca       # Mecatrónica
bun run test:live       # Tests con modelos reales
```

## 📝 Ejemplos

### Telecomunicaciones

```typescript
import { calculateLinkBudget, calculateAntenna } from './src/skills/telecom/rf-calculator.js';

// Presupuesto de enlace WiFi
const result = calculateLinkBudget({
  frequency: 2.4e9,      // 2.4 GHz
  txPower: 20,           // 20 dBm
  txAntennaGain: 10,     // 10 dBi
  rxAntennaGain: 10,     // 10 dBi
  distance: 1000,        // 1 km
});

console.log(`Potencia recibida: ${result.receivedPower.toFixed(2)} dBm`);
console.log(`Margen: ${result.margin.toFixed(2)} dB`);
console.log(`Factible: ${result.feasible}`);

// Diseño de antena parabólica
const antenna = calculateAntenna({
  frequency: 10e9,       // 10 GHz
  gain: 30,              // 30 dBi
  efficiency: 0.55,
});

console.log(`Diámetro necesario: ${antenna.diameter?.toFixed(2)} m`);
console.log(`Beamwidth: ${antenna.beamwidth?.toFixed(2)}°`);
```

### Mecatrónica

```typescript
import { stepResponse, tunePIDBySpecs } from './src/skills/meca/control-systems.js';

// Respuesta al escalón de sistema de segundo orden
const wn = 5;  // Frecuencia natural
const zeta = 0.7;  // Factor de amortiguamiento

const system = {
  numerator: [wn * wn],
  denominator: [1, 2 * zeta * wn, wn * wn],
};

const response = stepResponse(system, 10, 1000);

console.log(`Sobrepico: ${response.overshoot.toFixed(2)}%`);
console.log(`Tiempo de asentamiento: ${response.settlingTime.toFixed(3)} s`);
console.log(`Tiempo de subida: ${response.riseTime.toFixed(3)} s`);

// Sintonización PID
const pid = tunePIDBySpecs(system, {
  overshoot: 5,
  settlingTime: 2,
  riseTime: 0.5,
});

console.log(`Kp: ${pid.kp.toFixed(2)}, Ki: ${pid.ki.toFixed(2)}, Kd: ${pid.kd.toFixed(2)}`);
```

## 🌍 Variables de Entorno

```bash
# Opcional: URL personalizada de Ollama
OLLAMA_HOST=http://localhost:11434

# Opcional: URL de Qwen (si usas servidor compatible con OpenAI)
QWEN_BASE_URL=http://localhost:11434
QWEN_API_KEY=tu-api-key
```

## 📄 Licencia

MIT

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-habilidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva habilidad'`)
4. Push a la rama (`git push origin feature/nueva-habilidad`)
5. Abre un Pull Request

## 📞 Soporte

- Issues: https://github.com/tu-usuario/telecom-meca/issues
- Documentación: `/docs`

---

**Hecho con ❤️ para ingenieros en telecomunicaciones y mecatrónica**
