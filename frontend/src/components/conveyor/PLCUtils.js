// src/components/conveyor/PLCUtils.js
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function evalExpr(expr, context) {
  try {
    const tokenized = expr.replace(/\b[A-Za-z_][A-Za-z0-9_.]*\b/g, (name) => {
      const parts = name.split('.');
      let v = context;
      for (let p of parts) {
        if (v && p in v) v = v[p];
        else return 'false';
      }
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'object' && v !== null && 'state' in v) return v.state ? 'true' : 'false';
      return JSON.stringify(v);
    });
    const fn = new Function(`return (${tokenized});`);
    return !!fn();
  } catch (e) {
    console.warn('expr eval error', expr, e);
    return false;
  }
}

export function applyActions(actions, ctx) {
  if (!actions || !Array.isArray(actions)) return;

  for (const a of actions) {
    if (!a || !a.type) continue;

    if (a.type === 'set_output') {
      if (!a.name) continue;

      // Ensure outputs exists
      if (!ctx.outputs) ctx.outputs = {};

      if (a.name === 'motor_on') {
        ctx.outputs[a.name] = !!a.value;
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
    } else if (a.type === 'set_flag') {
      if (!a.name) continue;

      // Ensure flags exists
      if (!ctx.flags) ctx.flags = {};
      ctx.flags[a.name] = !!a.value;
    }
  }
}

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
    motor_on: false,
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
    start_sealed: false
  },
  rungs: [
    {
      id: 1,
      description: "Emergency Stop Safety Circuit",
      expr: "inputs.emergency_stop == true && inputs.safety_gate == true",
      actions: [
        { "type": "set_output", "name": "motor_on", "value": false },
        { "type": "set_flag", "name": "fault_active", "value": true }
      ]
    },
    {
      id: 2,
      description: "Motor Start Circuit with Seal-in",
      expr: "(inputs.start == true || flags.start_sealed == true) && inputs.stop == true && flags.fault_active == false",
      actions: [
        { "type": "set_output", "name": "motor_on", "value": true },
        { "type": "set_flag", "name": "start_sealed", "value": true }
      ]
    },
    {
      id: 3,
      description: "Object Counting at Sensor 2",
      expr: "inputs.sensor_2 == true && outputs.motor_on == true",
      actions: [
        { "type": "inc_counter", "name": "object_counter" },
        { "type": "inc_counter", "name": "today_parts" }
      ]
    },
    {
      id: 4,
      description: "Stop button pressed",
      expr: "inputs.stop == false",
      actions: [
        { "type": "set_output", "name": "motor_on", "value": false },
        { "type": "set_flag", "name": "start_sealed", "value": false }
      ]
    }
  ]
};

// Map backend style properties to frontend properties
export function normalizeStyle(backendStyle) {
  if (!backendStyle) return defaultStyle;

  return {
    // Map new backend properties to old frontend properties
    belt_color: backendStyle.belt_color || defaultStyle.belt_color,
    belt_length: backendStyle.belt_length || defaultStyle.belt_length,
    belt_width: backendStyle.belt_width || defaultStyle.belt_width,
    roller_count: backendStyle.roller_count || defaultStyle.roller_count,
    roller_color: backendStyle.roller_color || defaultStyle.roller_color,
    object_color: backendStyle.object_color || defaultStyle.object_color,
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
  belt_width: 30,
  roller_count: 8,
  roller_color: "#444",
  object_color: "#8b4513",
  sensor_color: "yellow",
  sensor_2_color: "orange",
  motor_color: "#222",
  camera_color: "#0080ff",
  sensor_x: 300,
  sensor_2_x: 600,
  camera_x: 50,
  camera_y: 10,
  belt_running_color: "#4CAF50",
  belt_stopped_color: "#F44336",
  camera_led_color: "#0080FF",
  sensor_led_color: "#FF9800"
};