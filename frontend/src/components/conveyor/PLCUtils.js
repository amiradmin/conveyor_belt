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

      if (a.name === 'motor_on') {
        if (!ctx.outputs) ctx.outputs = {};
        ctx.outputs[a.name] = !!a.value;
      } else if (a.name === 'count_signal' || (typeof a.value === 'string' && a.value.includes('count_signal'))) {
        if (!ctx.outputs) ctx.outputs = {};
        ctx.outputs[a.name] = (ctx.outputs[a.name] || 0) + 1;
      } else {
        if (!ctx.outputs) ctx.outputs = {};
        ctx.outputs[a.name] = !!a.value;
      }
    } else if (a.type === 'inc_counter') {
      if (!a.name) continue;

      if (!ctx.counters) ctx.counters = {};
      const c = ctx.counters[a.name];
      if (c) {
        if (typeof c === 'object') {
          c.current = (c.current || 0) + 1;
        } else {
          ctx.counters[a.name] = (ctx.counters[a.name] || 0) + 1;
        }
      } else {
        ctx.counters[a.name] = 1;
      }
    } else if (a.type === 'set_flag') {
      if (!a.name) continue;

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
    today_parts: 0
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
        { "type": "inc_counter", "name": "object_counter" }
      ]
    }
  ]
};

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
  camera_y: 10
};