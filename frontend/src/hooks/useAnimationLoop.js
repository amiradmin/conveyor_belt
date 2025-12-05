// src/components/conveyor/hooks/useAnimationLoop.js
import { useEffect, useRef } from 'react';
import { deepClone, evalExpr, applyActions } from '../components/conveyor/PLCUtils';

export const useAnimationLoop = ({ plc, style, currentSpeed, objects, setObjects, setOffset, setPlc }) => {
  const rafRef = useRef(null);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!plc || !style) return;

    let runningFlag = true;

    const tick = () => {
      if (!runningFlag) return;

      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const motorOn = !!plc.outputs?.motor_on;
      const pxPerSec = currentSpeed * 40;

      if (motorOn) {
        setOffset(o => (o + pxPerSec * dt / 1000) % 80);
        setObjects(prev => prev.map(o => ({
          ...o,
          x: o.x + pxPerSec * dt / 1000
        })));
      }

      // Sensor detection
      let s1Triggered = false, s2Triggered = false;
      setObjects(prev => prev.map(o => {
        const sensorX = style.sensor_x || 300;
        const sensor2X = style.sensor_2_x || 600;

        if (!o.triggered_s1 && o.x >= sensorX - 5 && o.x <= sensorX + 5) {
          s1Triggered = true;
          o.triggered_s1 = true;
        }
        if (!o.triggered_s2 && o.x >= sensor2X - 5 && o.x <= sensor2X + 5) {
          s2Triggered = true;
          o.triggered_s2 = true;
        }
        return o;
      }));

      const newPlc = deepClone(plc);
      if (!newPlc.inputs) newPlc.inputs = {};
      newPlc.inputs.sensor_1 = s1Triggered;
      newPlc.inputs.sensor_2 = s2Triggered;

      for (const rung of newPlc.rungs || []) {
        const hold = evalExpr(rung.expr, newPlc);
        if (hold) {
          applyActions(rung.actions || [], newPlc);
        }
      }

      if (!newPlc.outputs?.motor_on && newPlc.flags?.start_sealed) {
        newPlc.flags.start_sealed = false;
      }

      setPlc(newPlc);
      const beltLength = style.belt_length || 800;
      setObjects(prev => prev.filter(o => o.x < beltLength + 50));

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      runningFlag = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [plc, style, currentSpeed, setObjects, setOffset, setPlc]);
};