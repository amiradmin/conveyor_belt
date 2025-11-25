import React from "react";

export default function Radars() {
  const radars = [
    { id: 1, model: "Radar R100", range: "30m", status: "Online" },
    { id: 2, model: "Radar R200", range: "45m", status: "Online" },
    { id: 3, model: "Radar R300", range: "60m", status: "Offline" }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Radars</h1>
      <div className="bg-white shadow rounded-2xl p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Model</th>
              <th className="p-2">Range</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {radars.map((radar) => (
              <tr key={radar.id} className="border-t">
                <td className="p-2">{radar.id}</td>
                <td className="p-2">{radar.model}</td>
                <td className="p-2">{radar.range}</td>
                <td className="p-2">{radar.status}</td>
                <td className="p-2 text-blue-500 cursor-pointer hover:underline">View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}