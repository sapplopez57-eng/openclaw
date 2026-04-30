/**
 * Herramientas de cálculo RF y telecomunicaciones
 */

export interface LinkBudgetParams {
  frequency: number; // Hz
  txPower: number; // dBm
  txAntennaGain: number; // dBi
  rxAntennaGain: number; // dBi
  distance: number; // metros
  cableLossTx?: number; // dB
  cableLossRx?: number; // dB
  fadingMargin?: number; // dB
}

export interface LinkBudgetResult {
  freeSpacePathLoss: number; // dB
  totalGain: number; // dB
  totalLoss: number; // dB
  receivedPower: number; // dBm
  snr?: number; // dB
  feasible: boolean;
  margin: number; // dB
}

export interface AntennaParams {
  frequency: number; // Hz
  gain?: number; // dBi
  diameter?: number; // metros
  efficiency?: number; // 0-1
}

export interface AntennaResult {
  wavelength: number; // metros
  diameter?: number; // metros
  gain?: number; // dBi
  beamwidth?: number; // grados
  effectiveArea?: number; // m²
}

export interface ModulationParams {
  type: 'ASK' | 'FSK' | 'PSK' | 'QAM' | 'OFDM';
  bitrate: number; // bps
  bandwidth?: number; // Hz
  snr?: number; // dB
  order?: number; // Para QAM (4, 16, 64, 256)
}

export interface ModulationResult {
  symbolRate: number; // baudios
  bandwidthRequired: number; // Hz
  spectralEfficiency: number; // bps/Hz
  ber?: number; // Tasa de error de bits
  shannonCapacity?: number; // bps
}

/**
 * Calcula la pérdida de espacio libre (FSPL)
 * FSPL = 20*log10(d) + 20*log10(f) + 20*log10(4π/c)
 */
export function calculateFSPL(distance: number, frequency: number): number {
  const c = 299792458; // velocidad de la luz m/s
  const wavelength = c / frequency;
  
  // FSPL en dB
  return 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 20 * Math.log10(4 * Math.PI / c);
}

/**
 * Calcula el presupuesto de enlace completo
 */
export function calculateLinkBudget(params: LinkBudgetParams): LinkBudgetResult {
  const {
    frequency,
    txPower,
    txAntennaGain,
    rxAntennaGain,
    distance,
    cableLossTx = 0,
    cableLossRx = 0,
    fadingMargin = 10,
  } = params;

  const fspl = calculateFSPL(distance, frequency);
  
  const totalGain = txAntennaGain + rxAntennaGain;
  const totalLoss = fspl + cableLossTx + cableLossRx + fadingMargin;
  
  const receivedPower = txPower + totalGain - totalLoss;
  
  // Asumiendo sensibilidad típica de receptor (-90 dBm para WiFi)
  const receiverSensitivity = -90;
  const margin = receivedPower - receiverSensitivity;
  
  return {
    freeSpacePathLoss: fspl,
    totalGain,
    totalLoss,
    receivedPower,
    feasible: margin > 0,
    margin,
  };
}

/**
 * Calcula parámetros de antena
 */
export function calculateAntenna(params: AntennaParams): AntennaResult {
  const c = 299792458;
  const wavelength = c / params.frequency;
  
  const result: AntennaResult = {
    wavelength,
  };

  if (params.diameter && params.efficiency) {
    // Ganancia de antena parabólica
    const area = Math.PI * Math.pow(params.diameter / 2, 2);
    const effectiveArea = area * params.efficiency;
    const gain = 10 * Math.log10((4 * Math.PI * effectiveArea) / Math.pow(wavelength, 2));
    
    result.gain = gain;
    result.effectiveArea = effectiveArea;
    
    // Beamwidth aproximado
    result.beamwidth = 70 * (wavelength / params.diameter);
  } else if (params.gain) {
    // Calcular diámetro necesario para la ganancia especificada
    const efficiency = params.efficiency || 0.55;
    const linearGain = Math.pow(10, params.gain / 10);
    const effectiveArea = (linearGain * Math.pow(wavelength, 2)) / (4 * Math.PI);
    const area = effectiveArea / efficiency;
    const diameter = 2 * Math.sqrt(area / Math.PI);
    
    result.diameter = diameter;
    result.effectiveArea = effectiveArea;
    result.beamwidth = 70 * (wavelength / diameter);
  }

  return result;
}

/**
 * Calcula parámetros de modulación
 */
export function calculateModulation(params: ModulationParams): ModulationResult {
  const { type, bitrate, bandwidth, snr, order = 4 } = params;

  let bitsPerSymbol: number;
  
  switch (type) {
    case 'ASK':
    case 'FSK':
    case 'PSK':
    case 'QAM':
    case 'OFDM':
      bitsPerSymbol = Math.log2(order);
      break;
    default:
      bitsPerSymbol = 1;
  }

  const symbolRate = bitrate / bitsPerSymbol;
  const bandwidthRequired = bandwidth || symbolRate * (1 + 0.35); // Factor de roll-off típico
  const spectralEfficiency = bitrate / bandwidthRequired;

  // Capacidad de Shannon
  let shannonCapacity: number | undefined;
  if (snr !== undefined) {
    const snrLinear = Math.pow(10, snr / 10);
    shannonCapacity = bandwidthRequired * Math.log2(1 + snrLinear);
  }

  // BER aproximado (depende del tipo de modulación)
  let ber: number | undefined;
  if (snr !== undefined) {
    const snrLinear = Math.pow(10, snr / 10);
    
    switch (type) {
      case 'BPSK':
        ber = 0.5 * erfc(Math.sqrt(snrLinear));
        break;
      case 'QPSK':
        ber = 0.5 * erfc(Math.sqrt(snrLinear / 2));
        break;
      case 'QAM':
        ber = (4 / bitsPerSymbol) * (1 - 1 / Math.sqrt(order)) * 
              erfc(Math.sqrt((3 * snrLinear) / (2 * (order - 1))));
        break;
    }
  }

  return {
    symbolRate,
    bandwidthRequired,
    spectralEfficiency,
    ber,
    shannonCapacity,
  };
}

/**
 * Función de error complementaria (erfc)
 */
function erfc(x: number): number {
  // Aproximación numérica de erfc
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const tau = t * Math.exp(-x * x - 1.26551223 +
    t * (1.00002368 +
    t * (0.37409196 +
    t * (0.09678418 +
    t * (-0.18628806 +
    t * (0.27886807 +
    t * (-1.13520398 +
    t * (1.48851587 +
    t * (-0.82215223 +
    t * 0.17087277)))))))));
  
  return x >= 0 ? tau : 2 - tau;
}

/**
 * Convierte dBm a Watts
 */
export function dbmToWatts(dbm: number): number {
  return Math.pow(10, (dbm - 30) / 10);
}

/**
 * Convierte Watts a dBm
 */
export function wattsToDbm(watts: number): number {
  return 10 * Math.log10(watts * 1000);
}

/**
 * Convierte dB a ratio lineal
 */
export function dbToRatio(db: number): number {
  return Math.pow(10, db / 10);
}

/**
 * Convierte ratio lineal a dB
 */
export function ratioToDb(ratio: number): number {
  return 10 * Math.log10(ratio);
}

/**
 * Calcula la frecuencia de corte de una guía de onda rectangular
 */
export function calculateWaveguideCutoff(width: number, mode: number = 1): number {
  const c = 299792458;
  return (mode * c) / (2 * width);
}

/**
 * Calcula la impedancia característica de una línea de transmisión
 */
export function calculateCharacteristicImpedance(
  type: 'coaxial' | 'microstrip' | 'stripline',
  params: Record<string, number>
): number {
  switch (type) {
    case 'coaxial': {
      const { innerDiameter, outerDiameter, dielectricConstant = 1 } = params;
      return (138 / Math.sqrt(dielectricConstant)) * Math.log10(outerDiameter / innerDiameter);
    }
    case 'microstrip': {
      const { width, height, dielectricConstant = 4.4 } = params;
      const w_h = width / height;
      
      if (w_h <= 1) {
        return (60 / Math.sqrt(dielectricConstant)) * 
               Math.log(8 * height / width + width / (4 * height));
      } else {
        return (120 * Math.PI) / (
          Math.sqrt(dielectricConstant) * 
          (w_h + 1.393 + 0.667 * Math.log(w_h + 1.444))
        );
      }
    }
    case 'stripline': {
      const { width, height, dielectricConstant = 4.4 } = params;
      const b = 2 * height;
      return (60 / Math.sqrt(dielectricConstant)) * 
             Math.log(4 * b / (0.67 * Math.PI * width * (0.8 + width / b)));
    }
    default:
      throw new Error(`Unknown transmission line type: ${type}`);
  }
}
