import React, { useEffect, useState } from "react";

const AnimatedConveyor = ({ speed = 2, itemCount = 4 }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame;
    const animate = () => {
      setOffset((prev) => (prev + speed) % 40);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, [speed]);

  return (
    <svg width="700" height="180" style={{ border: "2px solid #888", background: "#f5f5f5" }}>
      <defs>
        <pattern
          id="beltPattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(-${offset},0)`}
        >
          <rect width="20" height="40" fill="#ddd" />
          <rect x="20" width="20" height="40" fill="#bbb" />
        </pattern>
      </defs>

      <rect x="80" y="60" width="520" height="50" fill="url(#beltPattern)" rx="10" />

      {/* Rollers */}
      {[...Array(6)].map((_, i) => (
        <circle key={i} cx={120 + i * 80} cy={85} r={12} fill="#666" />
      ))}

      {/* Moving items */}
      {[...Array(itemCount)].map((_, i) => {
        const x = ((i * 120 + offset * 6) % 500) + 90;
        return <rect key={i} x={x} y={65} width={25} height={25} fill="#2979ff" rx="4" />;
      })}

      {/* Sensor */}
      <rect x="560" y="52" width="14" height="65" fill="#ffeb3b" />
      <text x="530" y="45" fontSize="14">سنسور</text>

      {/* Motor */}
      <rect x="60" y="110" width={25} height={25} fill="#777" />
      <text x="35" y="150" fontSize="14">موتور</text>
    </svg>
  );
};

export default AnimatedConveyor;
