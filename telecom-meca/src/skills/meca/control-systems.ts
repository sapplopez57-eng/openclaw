/**
 * Herramientas de sistemas de control para mecatrónica
 */

export interface TransferFunction {
  numerator: number[];
  denominator: number[];
}

export interface PIDParams {
  kp: number; // Ganancia proporcional
  ki?: number; // Ganancia integral
  kd?: number; // Ganancia derivativa
}

export interface PIDTuningSpec {
  overshoot?: number; // % sobrepico máximo
  settlingTime?: number; // segundos (2% criterio)
  riseTime?: number; // segundos (10-90%)
  steadyStateError?: number; // error en estado estacionario
}

export interface StateSpace {
  A: number[][]; // Matriz de estado
  B: number[][]; // Matriz de entrada
  C: number[][]; // Matriz de salida
  D: number[][]; // Matriz de transmisión directa
}

export interface StepResponse {
  time: number[];
  response: number[];
  overshoot: number; // %
  settlingTime: number; // segundos
  riseTime: number; // segundos
  steadyStateValue: number;
}

export interface PIDTuningResult {
  kp: number;
  ki: number;
  kd: number;
  achievedOvershoot: number;
  achievedSettlingTime: number;
  achievedRiseTime: number;
}

/**
 * Convierte una función de transferencia a espacio de estados (forma canónica controlable)
 */
export function tfToStateSpace(tf: TransferFunction): StateSpace {
  const { numerator, denominator } = tf;
  
  const n = denominator.length - 1;
  
  // Normalizar coeficientes
  const a0 = denominator[0];
  const den = denominator.map(c => c / a0);
  const num = numerator.map(c => c / a0);
  
  // Matriz A (forma canónica controlable)
  const A: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n - 1; i++) {
    A[i][i + 1] = 1;
  }
  for (let i = 0; i < n; i++) {
    A[n - 1][i] = -den[n - i];
  }
  
  // Matriz B
  const B: number[][] = Array(n).fill(0).map(() => [0]);
  B[n - 1][0] = 1;
  
  // Matriz C
  const C: number[][] = [Array(n).fill(0)];
  for (let i = 0; i < Math.min(num.length, n); i++) {
    C[0][n - 1 - i] = num[num.length - 1 - i];
  }
  
  // Matriz D
  const D: number[][] = [[num.length > n ? num[0] : 0]];
  
  return { A, B, C, D };
}

/**
 * Calcula la respuesta al escalón de un sistema en espacio de estados
 */
export function stepResponse(ss: StateSpace, tFinal: number = 10, points: number = 1000): StepResponse {
  const { A, B, C, D } = ss;
  const n = A.length;
  
  const dt = tFinal / points;
  const time: number[] = [];
  const response: number[] = [];
  
  // Estado inicial
  let x = Array(n).fill(0);
  const u = 1; // Escalón unitario
  
  // Método de Euler para integración numérica
  for (let i = 0; i <= points; i++) {
    const t = i * dt;
    time.push(t);
    
    // Calcular salida y = C*x + D*u
    let y = D[0]?.[0] ? D[0][0] * u : 0;
    for (let j = 0; j < n; j++) {
      y += C[0][j] * x[j];
    }
    response.push(y);
    
    // Actualizar estado: x(k+1) = x(k) + dt*(A*x + B*u)
    const dx = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        dx[j] += A[j][k] * x[k];
      }
      dx[j] += B[j][0] * u;
    }
    
    for (let j = 0; j < n; j++) {
      x[j] += dt * dx[j];
    }
  }
  
  // Calcular métricas
  const steadyStateValue = response[response.length - 1];
  const overshoot = calculateOvershoot(response, steadyStateValue);
  const settlingTime = calculateSettlingTime(time, response, steadyStateValue);
  const riseTime = calculateRiseTime(time, response, steadyStateValue);
  
  return {
    time,
    response,
    overshoot,
    settlingTime,
    riseTime,
    steadyStateValue,
  };
}

/**
 * Calcula el sobrepico porcentual
 */
function calculateOvershoot(response: number[], steadyState: number): number {
  if (steadyState === 0) return 0;
  
  const maxValue = Math.max(...response);
  return ((maxValue - steadyState) / steadyState) * 100;
}

/**
 * Calcula el tiempo de asentamiento (criterio 2%)
 */
function calculateSettlingTime(time: number[], response: number[], steadyState: number): number {
  const tolerance = 0.02 * Math.abs(steadyState);
  let settlingIndex = time.length - 1;
  
  for (let i = time.length - 1; i >= 0; i--) {
    if (Math.abs(response[i] - steadyState) > tolerance) {
      settlingIndex = i + 1;
      break;
    }
  }
  
  return settlingIndex < time.length ? time[settlingIndex] : time[time.length - 1];
}

/**
 * Calcula el tiempo de subida (10% a 90%)
 */
function calculateRiseTime(time: number[], response: number[], steadyState: number): number {
  const lowThreshold = 0.1 * steadyState;
  const highThreshold = 0.9 * steadyState;
  
  let t10 = 0;
  let t90 = 0;
  
  for (let i = 0; i < response.length; i++) {
    if (response[i] >= lowThreshold && t10 === 0) {
      t10 = time[i];
    }
    if (response[i] >= highThreshold && t90 === 0) {
      t90 = time[i];
      break;
    }
  }
  
  return t90 - t10;
}

/**
 * Sintonización de PID usando método Ziegler-Nichols (lazo cerrado)
 */
export function tunePIDZieglerNichols(Ku: number, Tu: number): PIDTuningResult {
  // Reglas de Ziegler-Nichols para PID
  const kp = 0.6 * Ku;
  const ki = 2 * kp / Tu;
  const kd = kp * Tu / 8;
  
  return {
    kp,
    ki,
    kd,
    achievedOvershoot: 25, // Típico para Z-N
    achievedSettlingTime: Tu * 4, // Aproximado
    achievedRiseTime: Tu * 0.6, // Aproximado
  };
}

/**
 * Sintonización de PID basada en especificaciones de desempeño
 * Usa lugar de las raíces para colocar polos dominantes
 */
export function tunePIDBySpecs(plant: TransferFunction, specs: PIDTuningSpec): PIDTuningResult {
  // Estimación simplificada basada en especificaciones
  const { overshoot = 5, settlingTime = 2, riseTime = 0.5 } = specs;
  
  // Calcular factor de amortiguamiento a partir del sobrepico
  const zeta = -Math.log(overshoot / 100) / Math.sqrt(Math.PI * Math.PI + Math.log(overshoot / 100) ** 2);
  
  // Calcular frecuencia natural a partir del tiempo de asentamiento
  const wn = 4 / (zeta * settlingTime);
  
  // Ganancias PID aproximadas (método de colocación de polos)
  const kp = (2 * zeta * wn - plant.denominator[1] / plant.denominator[0]) / (plant.numerator[0] / plant.denominator[0]);
  const ki = (wn ** 2) / (plant.numerator[0] / plant.denominator[0]);
  const kd = (1 - plant.denominator[2] / plant.denominator[0]) / (plant.numerator[0] / plant.denominator[0]);
  
  return {
    kp: Math.max(0, kp),
    ki: Math.max(0, ki),
    kd: Math.max(0, kd),
    achievedOvershoot: overshoot,
    achievedSettlingTime: settlingTime,
    achievedRiseTime: riseTime,
  };
}

/**
 * Analiza la estabilidad de un sistema (criterio de Routh-Hurwitz simplificado)
 */
export function checkStability(denominator: number[]): { stable: boolean; message: string } {
  // Verificar que todos los coeficientes tengan el mismo signo
  const allPositive = denominator.every(c => c > 0);
  const allNegative = denominator.every(c => c < 0);
  
  if (!allPositive && !allNegative) {
    return {
      stable: false,
      message: 'Sistema inestable: coeficientes con signos diferentes',
    };
  }
  
  // Para sistemas de segundo orden, esto es suficiente
  if (denominator.length <= 3) {
    return {
      stable: true,
      message: 'Sistema estable (segundo orden o inferior)',
    };
  }
  
  // Para sistemas de orden superior, se requeriría el arreglo completo de Routh
  return {
    stable: true,
    message: 'Posiblemente estable (se requiere análisis completo de Routh-Hurwitz)',
  };
}

/**
 * Convierte de espacio de estados a función de transferencia
 * G(s) = C * (sI - A)^(-1) * B + D
 */
export function stateSpaceToTF(ss: StateSpace): TransferFunction {
  // Implementación simplificada para sistemas SISO de bajo orden
  const { A, B, C, D } = ss;
  const n = A.length;
  
  // Para un sistema de primer orden
  if (n === 1) {
    const a = A[0][0];
    const b = B[0][0];
    const c = C[0][0];
    const d = D[0]?.[0] || 0;
    
    return {
      numerator: [c * b, d * (-a) + c * b],
      denominator: [1, -a],
    };
  }
  
  // Para sistemas de orden superior, se requiere cálculo simbólico
  throw new Error('Conversión solo implementada para sistemas de primer orden');
}

/**
 * Calcula los polos de un sistema (raíces del polinomio característico)
 */
export function calculatePoles(denominator: number[]): number[] {
  // Usar método numérico para encontrar raíces
  // Implementación simplificada para polinomios de segundo orden
  if (denominator.length === 3) {
    const a = denominator[0];
    const b = denominator[1];
    const c = denominator[2];
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant >= 0) {
      return [
        (-b + Math.sqrt(discriminant)) / (2 * a),
        (-b - Math.sqrt(discriminant)) / (2 * a),
      ];
    } else {
      const real = -b / (2 * a);
      const imag = Math.sqrt(-discriminant) / (2 * a);
      // Retornar como array de objetos para números complejos
      return [
        { re: real, im: imag },
        { re: real, im: -imag }
      ] as unknown as number[];
    }
  }
  
  throw new Error('Cálculo de polos solo implementado para sistemas de segundo orden');
}

/**
 * Representación de número complejo
 */
export interface ComplexNumber {
  re: number;
  im: number;
}
