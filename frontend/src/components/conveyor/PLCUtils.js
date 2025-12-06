// src/components/conveyor/PLCUtils.js
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function evalExpr(expr, context) {
  try {
    // Replace variable names with their actual values
    const tokenized = expr.replace(/\b[A-Za-z_][A-Za-z0-9_.]*\b/g, (name) => {
      const parts = name.split('.');
      let v = context;

      for (let p of parts) {
        if (v && typeof v === 'object' && p in v) {
          v = v[p];
        } else {
//          console.log(`Variable ${name} not found in context`);
          return 'false';
        }
      }

      // Handle different types
      if (typeof v === 'boolean') {
        return v ? 'true' : 'false';
      }
      if (typeof v === 'number') {
        return String(v);
      }
      if (typeof v === 'object' && v !== null && 'state' in v) {
        return v.state ? 'true' : 'false';
      }
      if (typeof v === 'object' && v !== null && 'value' in v) {
        return v.value ? 'true' : 'false';
      }

      return JSON.stringify(v);
    });

//    console.log(`Evaluating expression: ${expr}`);
//    console.log(`Tokenized expression: ${tokenized}`);

    const fn = new Function(`return (${tokenized});`);
    const result = !!fn();

//    console.log(`Expression result: ${result}`);
    return result;

  } catch (e) {
//    console.warn('expr eval error', expr, e);
    return false;
  }
}

export function applyActions(actions, ctx) {
  if (!actions || !Array.isArray(actions)) return;

//  console.log('Applying actions:', actions);

  for (const a of actions) {
    if (!a || !a.type) continue;

    if (a.type === 'set_output') {
      if (!a.name) continue;

      // Ensure outputs exists
      if (!ctx.outputs) ctx.outputs = {};

      if (a.name === 'motor_on') {
        ctx.outputs[a.name] = !!a.value;
//        console.log(`Set motor_on to: ${!!a.value}`);
      } else if (a.name === 'count_signal' || (typeof a.value === 'string' && a.value.includes('count_signal'))) {
        ctx.outputs[a.name] = (ctx.outputs[a.name] || 0) + 1;
      } else {
        ctx.outputs[a.name] = !!a.value;
      }
    } else if (a.type === 'inc_counter') {
      if (!a.name) continue;

      // Ensure counters exists
      if (!ctx.counters) ctx.counters = {};

      if (typeof ctx.counters[a.name] === 'object' && ctx.counters[a.name] !== null) {
        ctx.counters[a.name].current = (ctx.counters[a.name].current || 0) + 1;
      } else {
        ctx.counters[a.name] = (ctx.counters[a.name] || 0) + 1;
      }
//      console.log(`Incremented counter ${a.name}`);
    } else if (a.type === 'set_flag') {
      if (!a.name) continue;

      // Ensure flags exists
      if (!ctx.flags) ctx.flags = {};
      ctx.flags[a.name] = !!a.value;
//      console.log(`Set flag ${a.name} to: ${!!a.value}`);
    }
  }
}

// SIMPLIFIED PLC LOGIC THAT WILL WORK
export const defaultPLC = {
  inputs: {
    start: false,
    stop: true,
    sensor_1: false,
    sensor_2: false,
    emergency_stop: true,
    motor_overload: false,
    safety_gate: true
  },
  outputs: {
    motor_on: true,
    alarm: false,
    count_signal: 0,
    running_indicator: false
  },
  counters: {
    object_counter: 0,
    today_parts: 0,
    jam_counter: 0
  },
  flags: {
    fault_active: false,
    start_sealed: false,
    jam_detected: false
  },
  rungs: [
    {
      id: 1,
      description: "Emergency Stop and Safety Check",
      expr: "inputs.emergency_stop && inputs.safety_gate",
      actions: [
        { "type": "set_flag", "name": "fault_active", "value": false }
      ]
    },
    {
      id: 2,
      description: "Motor Start - Simple Version",
      expr: "inputs.start && inputs.stop && !flags.fault_active",
      actions: [
        { "type": "set_output", "name": "motor_on", "value": true },
        { "type": "set_flag", "name": "start_sealed", "value": true }
      ]
    },
    {
      id: 3,
      description: "Motor Stop",
      expr: "!inputs.stop",
      actions: [
        { "type": "set_output", "name": "motor_on", "value": false },
        { "type": "set_flag", "name": "start_sealed", "value": false }
      ]
    },
    {
      id: 4,
      description: "Object Counting",
      expr: "inputs.sensor_2 && outputs.motor_on",
      actions: [
        { "type": "inc_counter", "name": "object_counter" },
        { "type": "inc_counter", "name": "today_parts" }
      ]
    }
  ]
};

// Map backend style properties to frontend properties
export function normalizeStyle(backendStyle) {
console.log(backendStyle.style.belt_width);
  if (!backendStyle) return defaultStyle;

  return {
    // Map new backend properties to old frontend properties
    belt_color: backendStyle.style.belt_color || defaultStyle.belt_color,
    belt_length: backendStyle.style.belt_length || defaultStyle.belt_length,
    belt_width: backendStyle.style.belt_width || defaultStyle.belt_width,
    roller_count: backendStyle.roller_count || defaultStyle.roller_count,
    roller_color: backendStyle.roller_color || defaultStyle.roller_color,
    object_color: backendStyle.object_color || defaultStyle.object_color,
    object_width: backendStyle.style?.object_width || backendStyle.object_width || defaultStyle.object_width,
    object_height: backendStyle.style?.object_height || backendStyle.object_height || defaultStyle.object_height,
    sensor_color: backendStyle.sensor_color || defaultStyle.sensor_color,
    sensor_2_color: backendStyle.sensor_2_color || defaultStyle.sensor_2_color,
    motor_color: backendStyle.motor_color || defaultStyle.motor_color,
    camera_color: backendStyle.camera_color || defaultStyle.camera_color,
    sensor_x: backendStyle.sensor_x || defaultStyle.sensor_x,
    sensor_2_x: backendStyle.sensor_2_x || defaultStyle.sensor_2_x,
    camera_x: backendStyle.camera_x || defaultStyle.camera_x,
    camera_y: backendStyle.camera_y || defaultStyle.camera_y,

    // New properties from backend
    belt_running_color: backendStyle.belt_running_color || "#4CAF50",
    belt_stopped_color: backendStyle.belt_stopped_color || "#F44336",
    camera_led_color: backendStyle.camera_led_color || "#0080FF",
    sensor_led_color: backendStyle.sensor_led_color || "#FF9800",

    // Keep original backend properties for saving
    ...backendStyle
  };
}

export const defaultStyle = {
  belt_color: "#5a5a5a",
  belt_length: 800,
  belt_width: 50,
  roller_count: 8,
  roller_color: "#444",
  object_color: "#8b4513",
  object_width: 30, // Configurable object width (default: 30px)
  object_height: 18, // Configurable object height (default: 18px)
  sensor_color: "yellow",
  sensor_2_color: "orange",
  motor_color: "#222",
  camera_color: "#0080ff",
  sensor_x: 300,
  sensor_2_x: 600,
  camera_x: 50,
  camera_y: 20,
  belt_running_color: "#4CAF50",
  belt_stopped_color: "#F44336",
  camera_led_color: "#0080FF",
  sensor_led_color: "#FF9800"
};