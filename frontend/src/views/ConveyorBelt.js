// ConveyorBelt.js
import React from "react";

export default function ConveyorBelt() {
  const conveyors = [
    { id: 1, name: "Conveyor A", status: "Running", speed: "2.4 m/s" },
    { id: 2, name: "Conveyor B", status: "Stopped", speed: "0 m/s" },
    { id: 3, name: "Conveyor C", status: "Running", speed: "3.1 m/s" }
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Conveyor Belts</h1>
      <div className="bg-white shadow rounded-2xl p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Status</th>
              <th className="p-2">Speed</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {conveyors.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2">{c.speed}</td>
                <td className="p-2 text-blue-500 cursor-pointer">View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
