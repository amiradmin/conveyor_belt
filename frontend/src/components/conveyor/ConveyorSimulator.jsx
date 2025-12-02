// src/components/ConveyorSimulator.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { DraggableCore } from 'react-draggable';

/*
Props:
  beltId (number) - conveyor belt id in backend
  apiBase (string) - base url, e.g. "http://localhost:8000/api/"
*/

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// --- Simple PLC emulator helpers ---
function evalExpr(expr, context) {
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
      return JSON.stringify(v);
    });
    const fn = new Function(`return (${tokenized});`);
    return !!fn();
  } catch (e) {
    console.warn('expr eval error', expr, e);
    return false;
  }
}

function applyActions(actions, ctx) {
  const outputsChanged = {};
  for (const a of actions || []) {
    if (a.type === 'set_output') {
      ctx.outputs[a.name] = !!a.value;
      outputsChanged[a.name] = ctx.outputs[a.name];
    } else if (a.type === 'inc_counter') {
      const c = ctx.counters[a.name];
      if (c) c.acc = (c.acc || 0) + 1;
    } else if (a.type === 'reset_counter') {
      const c = ctx.counters[a.name];
      if (c) c.acc = 0;
    } else if (a.type === 'pulse_output') {
      ctx.outputs[a.name] = true;
      setTimeout(() => {
        ctx.outputs[a.name] = false;
      }, a.ms || 300);
    }
  }
  return outputsChanged;
}

// --- React Component ---
export default function ConveyorSimulator({ beltId = 1, apiBase = 'http://localhost:8000/api/camera/' }) {
  const [belt, setBelt] = useState(null);
  const [style, setStyle] = useState(null);
  const [plc, setPlc] = useState(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  const [offset, setOffset] = useState(0);
  const [objects, setObjects] = useState([]);
  const svgRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [sensorX, setSensorX] = useState(500);
  const sensorRef = useRef(null);

  // fetch belt
  useEffect(() => {
    async function fetchBelt() {
      try {
        const res = await axios.get(`${apiBase}conveyor-belts/${beltId}/`);
        const data = res.data;

        setBelt(data);

        setStyle(
          data.style || {
            belt_color: 'url(#beltPattern)',
            belt_width: 40,
            roller_count: 6,
            belt_length: 500,
            object_color: 'steelblue',
            motor_color: '#777',
            sensor_color: 'yellow',
          }
        );

        setPlc(
          data.plc_logic || {
            inputs: { start: false, stop: false, sensor_1: false },
            timers: {},
            counters: {},
            rungs: [],
            outputs: {},
          }
        );

        setObjects([{ id: 1, x: 120 }, { id: 2, x: 240 }, { id: 3, x: 360 }]);

        sensorRef.current = data.style?.sensor_x || 500;
        setSensorX(sensorRef.current);
      } catch (e) {
        console.error('fetch belt error', e);
      }
    }
    fetchBelt();
  }, [beltId, apiBase]);

  // tick: animation + plc evaluation
  useEffect(() => {
    if (!plc) return;
    let runningFlag = true;

    function tick() {
      if (!runningFlag) return;

      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const motorOn = !!plc?.outputs?.motor_on;
      const speed = belt?.current_speed || 1.0;
      const pxPerSec = 40 * speed;

      if (motorOn && running) {
        setOffset((o) => (o + (pxPerSec * (dt / 1000))) % 80);
        setObjects((prev) =>
          prev.map((obj) => ({ ...obj, x: obj.x + pxPerSec * (dt / 1000) }))
        );
      }

      const sensorPos = sensorRef.current || 500;
      let sensorTriggered = false;

      setObjects((prev) =>
        prev.map((o) => {
          if (!o.triggered && o.x >= sensorPos - 5 && o.x <= sensorPos + 5) {
            sensorTriggered = true;
            return { ...o, triggered: true };
          }
          return o;
        })
      );

      if (!plc.inputs) plc.inputs = {};
      plc.inputs.sensor_1 = sensorTriggered;

      Object.entries(plc?.timers || {}).forEach(([k, t]) => {
        if (t.type === 'TON') {
          if (t.running) {
            t.acc_ms = (t.acc_ms || 0) + dt;
            t.done = t.acc_ms >= (t.preset_ms || 0);
          } else {
            t.acc_ms = 0;
            t.done = false;
          }
        }
      });

      const ctx = {
        inputs: plc.inputs || {},
        timers: plc.timers || {},
        counters: plc.counters || {},
        outputs: plc.outputs || {},
      };

      for (const rung of plc.rungs || []) {
        const hold = evalExpr(rung.expr, ctx);
        if (hold) applyActions(rung.actions, ctx);
      }

      setPlc({ ...plc, inputs: ctx.inputs, timers: ctx.timers, counters: ctx.counters, outputs: ctx.outputs });

      // Remove objects off-belt
      setObjects((prev) => prev.filter((o) => o.x < 580));

      // Re-add objects if less than desired
      const desired = style?.initial_objects || 3;
      setObjects((prev) => {
        if (prev.length < desired) {
          const lastX = prev.length ? Math.max(...prev.map((p) => p.x)) : 80;
          const newId = Date.now();
          return [...prev, { id: newId, x: lastX - 120 }];
        }
        return prev;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    lastTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      runningFlag = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [plc, running, belt, style]);

  const toggleStart = () => {
    if (!plc) return;
    const newPlc = deepClone(plc);
    newPlc.inputs.start = true;
    newPlc.inputs.stop = false;
    setPlc(newPlc);
    setRunning(true);
    setLog((l) => [`Start pressed @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const toggleStop = () => {
    if (!plc) return;
    const newPlc = deepClone(plc);
    newPlc.inputs.stop = true;
    newPlc.inputs.start = false;
    setPlc(newPlc);
    setRunning(false);
    setLog((l) => [`Stop pressed @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
  };

  const saveConfig = async () => {
    try {
      const payload = { style, plc_logic: plc };
      await axios.patch(`${apiBase}conveyor-belts/${beltId}/`, payload);
      setLog((l) => [`Saved config @ ${new Date().toLocaleTimeString()}`, ...l].slice(0, 50));
    } catch (e) {
      console.error('save error', e);
      setLog((l) => [`Save error ${e}`, ...l].slice(0, 50));
    }
  };

  const onSensorDrag = (e, data) => {
    const x = sensorX + data.deltaX;
    const absX = Math.max(60, Math.min(560, x));
    setSensorX(absX);
    sensorRef.current = absX;
    setStyle((s) => ({ ...s, sensor_x: absX }));
  };

  if (!belt || !plc || !style) return <div>Loading simulator...</div>;

  const outputs = plc?.outputs || {};

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div>
        <h3>{belt.name} (Simulator)</h3>
        <svg ref={svgRef} width={940} height={180} style={{ border: '1px solid #ddd', background: '#fafafa' }}>
          <defs>
            <pattern id="beltPattern" width="40" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="20" height="20" fill="#bdbdbd" />
              <rect x="20" y="0" width="20" height="20" fill="#9e9e9e" />
            </pattern>
          </defs>

          <rect x="60" y="60" width={style.belt_length} height={style.belt_width} fill={style.belt_color} rx="6" stroke="#666" />

          {Array.from({ length: style.roller_count || 6 }).map((_, i) => {
            const cx = 90 + i * ((style.belt_length || 500) / ((style.roller_count || 6) - 1));
            return <circle key={i} cx={cx} cy={80 + (style.belt_width || 40) / 2} r={10} fill={style.roller_color || '#555'} />;
          })}

          {objects.map((o) => (
            <rect key={o.id} x={o.x} y={70} width={24} height={24} rx={4} fill={style.object_color || 'steelblue'} stroke="#222" />
          ))}

          <DraggableCore axis="x" bounds={{ left: 60, right: 60 + (style.belt_length || 500) - 10 }} onDrag={onSensorDrag}>
            <rect
              ref={sensorRef}
              x={sensorX - 5}
              y={50}
              width={10}
              height={60}
              fill={style.sensor_color || 'yellow'}
              stroke="#333"
              style={{ cursor: 'grab' }}
            />
          </DraggableCore>

          <rect x={30} y={110} width={24} height={24} fill={style.motor_color || '#777'} />
          <text x={10} y={150} fontSize={12}>
            Motor
          </text>
        </svg>

        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button onClick={toggleStart}>Start</button>
          <button onClick={toggleStop}>Stop</button>
          <button onClick={() => setObjects([{ id: Date.now(), x: 120 }])}>Reset Objects</button>
          <button onClick={saveConfig}>Save config</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <b>Outputs:</b>{' '}
          {Object.entries(outputs).map(([k, v]) => (
            <span key={k} style={{ marginRight: 8 }}>
              {k}: <strong>{String(v)}</strong>
            </span>
          ))}
        </div>
      </div>

      <div style={{ width: 320 }}>
        <h4>PLC (live)</h4>
        <div style={{ maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', color: 'black', background: '#fff', padding: 8, border: '1px solid #eee' }}>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(plc, null, 2)}</pre>
        </div>

        <h4>Logs</h4>
        <div style={{ maxHeight: 200, overflow: 'auto', background: '#111', color: '#fff', padding: 8 }}>
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        <h4>Edit PLC rungs</h4>
        <p style={{ fontSize: 12 }}>This is a simple JSON editor for PLC logic. For complex logic use a dedicated editor.</p>
        <textarea
          style={{ width: '100%', height: 200 }}
          value={JSON.stringify(plc, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setPlc(parsed);
            } catch (err) {}
          }}
        />
      </div>
    </div>
  );
}
