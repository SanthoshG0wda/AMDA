

const MACHINES = ["CNC_01", "CNC_02", "PUMP_03", "CONVEYOR_04"];

const SAMPLES_PER_CLASS = 1000;

const BASELINES = {
  CNC_01: {
    vibration_mm_s: 0.8,
    spindle_current_percent: 42,
    spindle_temperature_C: 41,
    acoustic_dba: 78,
    lubrication_pressure_bar: 2.1,
    coolant_temperature_C: 26,
  },
  CNC_02: {
    vibration_mm_s: 0.9,
    spindle_current_percent: 46,
    spindle_temperature_C: 43,
    acoustic_dba: 80,
    lubrication_pressure_bar: 2.0,
    coolant_temperature_C: 27,
  },
  PUMP_03: {
    vibration_mm_s: 1.3,
    motor_current_A: 12.0,
    bearing_temperature_C: 54,
    suction_pressure_bar: 1.1,
    discharge_pressure_bar: 4.2,
    flow_rate_lpm: 220,
  },
  CONVEYOR_04: {
    vibration_mm_s: 0.8,
    motor_current_A: 6.2,
    gearbox_temperature_C: 42,
    belt_speed_mps: 1.5,
    load_kg: 180,
    belt_alignment_mm: 2.0,
  },
};

const FAILURE_CLASSES = {
  CNC_01: [
    "none",
    "spindle_bearing_failure",
    "tool_wear",
    "lubrication_failure",
    "tool_breakage",
  ],

  CNC_02: [
    "none",
    "cutting_overload",
    "chatter",
    "coolant_failure",
    "spindle_misalignment",
  ],

  PUMP_03: [
    "none",
    "bearing_failure",
    "cavitation",
    "seal_leakage",
    "impeller_damage",
    "clogging",
    "dry_run",
  ],

  CONVEYOR_04: [
  "none",
  "roller_bearing_failure",
  "belt_misalignment",
  "overload",
  "belt_slip",
  "gearbox_overheating",
  "jam",
],
};

const rand = (min, max) => Math.random() * (max - min) + min;
const fix = (n, d = 2) => parseFloat(n.toFixed(d));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const maybe = (p) => Math.random() < p;

function sensorNoise(value, pct = 0.06, absolute = 0) {
  return value + rand(-value * pct, value * pct) + rand(-absolute, absolute);
}

function driftFactor() {
  return rand(0.65, 1.15);
}

function makeBorderline(failure) {
  return maybe(failure === "none" ? 0.12 : 0.22);
}

function maybeMislabel(failure, classes) {
 
  if (failure === "none") return failure;
  if (!maybe(0.025)) return failure;

  const alternatives = classes.filter((c) => c !== failure);
  return alternatives[Math.floor(Math.random() * alternatives.length)];
}

function getCncStatus(reading) {
  if (
    reading.vibration_mm_s > 4.5 ||
    reading.spindle_temperature_C > 70 ||
    reading.spindle_current_percent > 120 ||
    reading.lubrication_pressure_bar < 0.8 ||
    reading.coolant_temperature_C > 40
  ) {
    return "fault";
  }

  if (
    reading.vibration_mm_s > 2.0 ||
    reading.spindle_temperature_C > 58 ||
    reading.spindle_current_percent > 85 ||
    reading.lubrication_pressure_bar < 1.2 ||
    reading.coolant_temperature_C > 34 ||
    reading.acoustic_dba > 92
  ) {
    return "warning";
  }

  return "running";
}

function getPumpStatus(reading) {
  if (
    reading.vibration_mm_s > 3.5 ||
    reading.motor_current_A > 20 ||
    reading.bearing_temperature_C > 75 ||
    reading.suction_pressure_bar < 0.5 ||
    reading.discharge_pressure_bar < 1.8 ||
    reading.flow_rate_lpm < 80
  ) {
    return "fault";
  }

  if (
    reading.vibration_mm_s > 2.0 ||
    reading.motor_current_A > 16 ||
    reading.bearing_temperature_C > 65 ||
    reading.suction_pressure_bar < 0.8 ||
    reading.discharge_pressure_bar < 2.5 ||
    reading.flow_rate_lpm < 120
  ) {
    return "warning";
  }

  return "running";
}

function getConveyorStatus(reading) {
  if (
    reading.vibration_mm_s > 4.0 ||
    reading.motor_current_A > 14 ||
    reading.gearbox_temperature_C > 80 ||
    reading.belt_alignment_mm > 10 ||
    reading.load_kg > 380
  ) {
    return "fault";
  }

  if (
    reading.vibration_mm_s > 2.0 ||
    reading.motor_current_A > 10 ||
    reading.gearbox_temperature_C > 65 ||
    reading.belt_alignment_mm > 6 ||
    reading.load_kg > 280
  ) {
    return "warning";
  }

  return "running";
}

function generateCnc01Reading(timestamp, failure) {
  let vibration;
  let spindleCurrent;
  let spindleTemp;
  let acoustic;
  let lubricationPressure;
  let coolantTemp = rand(25.22, 26.78);

  switch (failure) {
    case "none":
      vibration = rand(0.74, 0.86);
      spindleCurrent = rand(39.48, 44.52);
      spindleTemp = rand(39.36, 42.64);
      acoustic = rand(75.66, 80.34);
      lubricationPressure = rand(2.02, 2.18);
      break;

    case "spindle_bearing_failure":
  vibration = rand(2.0, 4.2);
  spindleCurrent = rand(42, 58);
  spindleTemp = rand(50, 66);
  acoustic = rand(84, 94);
  lubricationPressure = rand(1.95, 2.18);
  break;

    case "tool_wear":
  vibration = rand(1.05, 1.65);
  spindleCurrent = rand(48, 62);
  spindleTemp = rand(43, 51);
  acoustic = rand(82, 90);
  lubricationPressure = rand(1.95, 2.18);
  break;

    case "lubrication_failure":
  vibration = rand(1.6, 3.6);
  spindleCurrent = rand(42, 60);
  spindleTemp = rand(50, 68);
  acoustic = rand(82, 94);
  lubricationPressure = rand(0.65, 1.35);
  break;

    case "tool_breakage":
      vibration = rand(4.00, 6.91);
      spindleCurrent = rand(68.99, 86.95);
      spindleTemp = rand(45.07, 50.98);
      acoustic = rand(88.37, 96.62);
      lubricationPressure = rand(2.02, 2.18);
      break;
  }
  const borderline = makeBorderline(failure);
const severity = borderline ? rand(0.45, 0.75) : rand(0.85, 1.15);

vibration = BASELINES["CNC_01"] ? vibration : vibration;

vibration = sensorNoise(vibration * severity, 0.08, 0.08);
spindleCurrent = sensorNoise(spindleCurrent * severity, 0.06, 1.2);
spindleTemp = sensorNoise(spindleTemp * severity, 0.04, 0.8);
acoustic = sensorNoise(acoustic * severity, 0.04, 1.5);
lubricationPressure = sensorNoise(lubricationPressure, 0.08, 0.08);
coolantTemp = sensorNoise(coolantTemp, 0.05, 0.6);

  const reading = {
    machine_id: "CNC_01",
    machine_type: "cnc",
    timestamp: timestamp.toISOString(),
    vibration_mm_s: fix(clamp(vibration, 0.1, 8.0)),
    spindle_current_percent: fix(clamp(spindleCurrent, 0, 160)),
    spindle_temperature_C: fix(clamp(spindleTemp, 20, 90)),
    acoustic_dba: fix(clamp(acoustic, 55, 110)),
    lubrication_pressure_bar: fix(clamp(lubricationPressure, 0, 4)),
    coolant_temperature_C: fix(clamp(coolantTemp, 18, 50)),
    active_failure: maybeMislabel(failure, FAILURE_CLASSES.CNC_01),
  };
  

  reading.status = getCncStatus(reading);
  return reading;
}

function generateCnc02Reading(timestamp, failure) {
  let vibration;
  let spindleCurrent;
  let spindleTemp;
  let acoustic;
  let lubricationPressure = rand(1.92, 2.12);
  let coolantTemp;

  switch (failure) {
    case "none":
      vibration = rand(0.82, 0.98);
      spindleCurrent = rand(43, 49);
      spindleTemp = rand(41, 45);
      acoustic = rand(77, 82);
      coolantTemp = rand(26, 28);
      break;

  case "cutting_overload":
  
  vibration = rand(1.3, 2.4);
  spindleCurrent = rand(72, 98);      
  spindleTemp = rand(58, 74);
  acoustic = rand(82, 90);
  coolantTemp = rand(30, 37);
  break;

    case "chatter":
  vibration = rand(2.0, 3.2);       
  spindleCurrent = rand(45, 60);    
  spindleTemp = rand(45, 55);        
  acoustic = rand(90, 105);         
  coolantTemp = rand(26, 30);
  break;

    case "coolant_failure":
      vibration = rand(1.0, 1.8);
      spindleCurrent = rand(48, 58);
      spindleTemp = rand(52, 65);
      acoustic = rand(80, 87);
      coolantTemp = rand(34, 45);
      break;
case "spindle_misalignment":
  vibration = rand(3.0, 4.8);        
  spindleCurrent = rand(48, 64);     
  spindleTemp = rand(46, 58);
  acoustic = rand(82, 90);           
  coolantTemp = rand(26, 31);
  break;
  }

  const borderline = makeBorderline(failure);
  const severity = borderline ? rand(0.45, 0.75) : rand(0.85, 1.15);

vibration = BASELINES["CNC_02"] ? vibration : vibration;

vibration = sensorNoise(vibration * severity, 0.08, 0.08);
spindleCurrent = sensorNoise(spindleCurrent * severity, 0.06, 1.2);
spindleTemp = sensorNoise(spindleTemp * severity, 0.04, 0.8);
acoustic = sensorNoise(acoustic * severity, 0.04, 1.5);
lubricationPressure = sensorNoise(lubricationPressure, 0.08, 0.08);
coolantTemp = sensorNoise(coolantTemp, 0.05, 0.6);
  const reading = {
    machine_id: "CNC_02",
    machine_type: "cnc",
    timestamp: timestamp.toISOString(),
    vibration_mm_s: fix(clamp(vibration, 0.1, 8.0)),
    spindle_current_percent: fix(clamp(spindleCurrent, 0, 160)),
    spindle_temperature_C: fix(clamp(spindleTemp, 20, 90)),
    acoustic_dba: fix(clamp(acoustic, 55, 110)),
    lubrication_pressure_bar: fix(clamp(lubricationPressure, 0, 4)),
    coolant_temperature_C: fix(clamp(coolantTemp, 18, 50)),
    active_failure: maybeMislabel(failure, FAILURE_CLASSES.CNC_02),
  };

  reading.status = getCncStatus(reading);
  return reading;
}

function generatePumpReading(timestamp, failure) {
  let vibration;
  let motorCurrent;
  let bearingTemp;
  let suctionPressure;
  let dischargePressure;
  let flowRate;

  const operatingFactor = rand(0.85, 1.18);
  const borderline = Math.random() < (failure === "none" ? 0.10 : 0.22);
  const severity = borderline ? rand(0.45, 0.75) : rand(0.85, 1.15);

  switch (failure) {
    case "none":
      vibration = rand(1.05, 1.75);
      motorCurrent = rand(10.5, 14.2) * operatingFactor;
      bearingTemp = rand(49, 60);
      suctionPressure = rand(0.9, 1.25);
      dischargePressure = rand(3.7, 4.7);
      flowRate = rand(195, 245) * operatingFactor;
      break;

    case "bearing_failure":
      vibration = rand(1.8, 3.9) * severity;
      motorCurrent = rand(12.2, 17.4) * operatingFactor;
      bearingTemp = rand(60, 84) * severity;
      suctionPressure = rand(0.85, 1.18);
      dischargePressure = rand(3.5, 4.5);
      flowRate = rand(180, 235) * operatingFactor;
      break;

    case "cavitation":
      vibration = rand(2.0, 5.2) * severity;
      motorCurrent = rand(11.5, 16.2) * operatingFactor;
      bearingTemp = rand(53, 68);
      suctionPressure = rand(0.15, 0.82);
      dischargePressure = rand(2.0, 3.8);
      flowRate = rand(85, 190);
      break;

    case "seal_leakage":
      vibration = rand(1.1, 2.35) * severity;
      motorCurrent = rand(10.8, 15.2) * operatingFactor;
      bearingTemp = rand(50, 64);
      suctionPressure = rand(0.82, 1.18);
      dischargePressure = rand(2.1, 3.8);
      flowRate = rand(130, 210);
      break;

    case "impeller_damage":
      vibration = rand(1.5, 3.35) * severity;
      motorCurrent = rand(12.0, 18.5) * operatingFactor;
      bearingTemp = rand(54, 72);
      suctionPressure = rand(0.7, 1.15);
      dischargePressure = rand(1.3, 3.3);
      flowRate = rand(75, 185);
      break;

    case "clogging":
      vibration = rand(1.4, 3.1) * severity;
      motorCurrent = rand(14.5, 23.5) * operatingFactor;
      bearingTemp = rand(58, 78);
      suctionPressure = rand(0.35, 1.0);
      dischargePressure = rand(4.3, 6.8);
      flowRate = rand(45, 155);
      break;

    case "dry_run":
      vibration = rand(1.7, 4.7) * severity;
      motorCurrent = rand(7.0, 14.5) * operatingFactor;
      bearingTemp = rand(66, 94);
      suctionPressure = rand(0.0, 0.45);
      dischargePressure = rand(0.0, 1.8);
      flowRate = rand(0, 75);
      break;
  }

  vibration += rand(-0.25, 0.25);
  motorCurrent += rand(-0.7, 0.7);
  bearingTemp += rand(-2.5, 2.5);
  suctionPressure += rand(-0.08, 0.08);
  dischargePressure += rand(-0.18, 0.18);
  flowRate += rand(-14, 14);

  if (Math.random() < 0.10) {
    vibration += rand(-0.7, 0.7);
    motorCurrent += rand(-1.5, 1.5);
    bearingTemp += rand(-5, 5);
    suctionPressure += rand(-0.15, 0.15);
    dischargePressure += rand(-0.35, 0.35);
    flowRate += rand(-30, 30);
  }

  if (Math.random() < 0.04) {
    if (failure === "cavitation") suctionPressure += rand(0.15, 0.35);
    if (failure === "clogging") motorCurrent -= rand(2, 4);
    if (failure === "dry_run") flowRate += rand(20, 45);
    if (failure === "seal_leakage") dischargePressure += rand(0.3, 0.7);
  }

  const reading = {
    machine_id: "PUMP_03",
    machine_type: "pump",
    timestamp: timestamp.toISOString(),
    vibration_mm_s: fix(clamp(vibration, 0.1, 6.0)),
    motor_current_A: fix(clamp(motorCurrent, 1, 28)),
    bearing_temperature_C: fix(clamp(bearingTemp, 20, 95)),
    suction_pressure_bar: fix(clamp(suctionPressure, 0, 2)),
    discharge_pressure_bar: fix(clamp(dischargePressure, 0, 7)),
    flow_rate_lpm: fix(clamp(flowRate, 0, 350)),
    active_failure: maybeMislabel
      ? maybeMislabel(failure, FAILURE_CLASSES.PUMP_03)
      : failure,
  };

  reading.status = getPumpStatus(reading);
  return reading;
}

function generateConveyorReading(timestamp, failure) {
  let vibration;
  let motorCurrent;
  let gearboxTemp;
  let beltSpeed;
  let load;
  let beltAlignment;

  const operatingLoadFactor = rand(0.8, 1.25);
  const borderline = Math.random() < (failure === "none" ? 0.10 : 0.20);
  const severity = borderline ? rand(0.50, 0.78) : rand(0.85, 1.15);

  switch (failure) {
    case "none":
      vibration = rand(0.6, 1.25);
      motorCurrent = rand(5.2, 7.8);
      gearboxTemp = rand(37, 50);
      beltSpeed = rand(1.32, 1.68);
      load = rand(130, 245) * operatingLoadFactor;
      beltAlignment = rand(0.8, 4.5);
      break;

    case "roller_vibration_spike":
    case "roller_bearing_failure":
      vibration = rand(1.9, 5.3) * severity;
      motorCurrent = rand(5.8, 9.5);
      gearboxTemp = rand(40, 61);
      beltSpeed = rand(1.22, 1.65);
      load = rand(145, 275) * operatingLoadFactor;
      beltAlignment = rand(1.6, 6.5);
      break;

    case "belt_misalignment":
      vibration = rand(1.2, 3.6) * severity;
      motorCurrent = rand(6.5, 11.2);
      gearboxTemp = rand(42, 65);
      beltSpeed = rand(1.08, 1.58);
      load = rand(150, 285) * operatingLoadFactor;
      beltAlignment = rand(5.5, 15.0);
      break;

    case "overload":
      vibration = rand(1.0, 3.3) * severity;
      motorCurrent = rand(9.0, 17.5) * operatingLoadFactor;
      gearboxTemp = rand(47, 78);
      beltSpeed = rand(0.78, 1.45);
      load = rand(270, 500) * operatingLoadFactor;
      beltAlignment = rand(1.8, 7.5);
      break;

    case "belt_slip":
      vibration = rand(1.0, 3.0) * severity;
      motorCurrent = rand(7.0, 13.5);
      gearboxTemp = rand(43, 67);
      beltSpeed = rand(0.45, 1.12);
      load = rand(120, 260) * operatingLoadFactor;
      beltAlignment = rand(2.0, 8.0);
      break;

    case "gearbox_overheating":
      vibration = rand(1.0, 3.4) * severity;
      motorCurrent = rand(7.2, 14.2);
      gearboxTemp = rand(62, 110);
      beltSpeed = rand(1.15, 1.62);
      load = rand(170, 340) * operatingLoadFactor;
      beltAlignment = rand(1.8, 7.0);
      break;

    case "jam":
      vibration = rand(2.0, 5.5) * severity;
      motorCurrent = rand(12.0, 22.0);
      gearboxTemp = rand(55, 95);
      beltSpeed = rand(0.0, 0.65);
      load = rand(300, 600) * operatingLoadFactor;
      beltAlignment = rand(3.0, 12.0);
      break;
  }

  vibration += rand(-0.22, 0.22);
  motorCurrent += rand(-0.55, 0.55);
  gearboxTemp += rand(-2.2, 2.2);
  beltSpeed += rand(-0.06, 0.06);
  load += rand(-18, 18);
  beltAlignment += rand(-0.55, 0.55);

  if (Math.random() < 0.10) {
    vibration += rand(-0.8, 0.8);
    motorCurrent += rand(-1.4, 1.4);
    gearboxTemp += rand(-5, 5);
    beltSpeed += rand(-0.12, 0.12);
    load += rand(-45, 45);
    beltAlignment += rand(-1.5, 1.5);
  }

  if (Math.random() < 0.04) {
    if (failure === "overload") motorCurrent -= rand(1.5, 3.2);
    if (failure === "gearbox_overheating") vibration -= rand(0.3, 0.9);
    if (failure === "belt_misalignment") vibration -= rand(0.3, 0.8);
    if (failure === "roller_vibration_spike" || failure === "roller_bearing_failure") {
      motorCurrent -= rand(0.5, 1.6);
      gearboxTemp -= rand(1, 4);
    }
    if (failure === "jam") beltSpeed += rand(0.15, 0.35);
    if (failure === "belt_slip") load += rand(40, 90);
  }

  const reading = {
    machine_id: "CONVEYOR_04",
    machine_type: "conveyor",
    timestamp: timestamp.toISOString(),
    vibration_mm_s: fix(clamp(vibration, 0.1, 12)),
    motor_current_A: fix(clamp(motorCurrent, 1, 30)),
    gearbox_temperature_C: fix(clamp(gearboxTemp, 20, 130)),
    belt_speed_mps: fix(clamp(beltSpeed, 0, 5)),
    load_kg: fix(clamp(load, 0, 650)),
    belt_alignment_mm: fix(clamp(beltAlignment, 0, 20)),
    active_failure: maybeMislabel
      ? maybeMislabel(failure, FAILURE_CLASSES.CONVEYOR_04)
      : failure,
  };

  reading.status = getConveyorStatus(reading);
  return reading;
}

function generateReading(machineId, timestamp, failure) {
  if (machineId === "CNC_01") {
    return generateCnc01Reading(timestamp, failure);
  }

  if (machineId === "CNC_02") {
    return generateCnc02Reading(timestamp, failure);
  }

  if (machineId === "PUMP_03") {
    return generatePumpReading(timestamp, failure);
  }

  if (machineId === "CONVEYOR_04") {
    return generateConveyorReading(timestamp, failure);
  }

  throw new Error(`Unknown machine_id: ${machineId}`);
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}



function generateAllHistory() {
  const history = {};
  const now = Date.now();

  for (const machineId of MACHINES) {
    history[machineId] = [];

    for (const failure of FAILURE_CLASSES[machineId]) {
      for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
        const timestamp = new Date(now - history[machineId].length * 60 * 1000);
        history[machineId].push(generateReading(machineId, timestamp, failure));
      }
    }

    history[machineId] = shuffle(history[machineId]);

    console.log(`\n✅ ${machineId} balanced dataset generated`);

    for (const failure of FAILURE_CLASSES[machineId]) {
      const count = history[machineId].filter(
        (row) => row.active_failure === failure
      ).length;

      console.log(`${failure}: ${count}`);
    }
  }

  return history;
}

module.exports = {
  generateAllHistory,
  generateReading,
  MACHINES,
  BASELINES,
  FAILURE_CLASSES,
};