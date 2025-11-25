import React from "react";

export default function Ultrasonic() {
  const ultrasonicSensors = [
    { id: 1, name: "US-01", location: "Zone A", distance: "22 cm", status: "Online" },
    { id: 2, name: "US-02", location: "Zone B", distance: "18 cm", status: "Online" },
    { id: 3, name: "US-03", location: "Zone C", distance: "25 cm", status: "Offline" }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Ultrasonic Sensors</h1>
      <div className="bg-white shadow rounded-2xl p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Location</th>
              <th className="p-2">Distance</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ultrasonicSensors.map((sensor) => (
              <tr key={sensor.id} className="border-t">
                <td className="p-2">{sensor.id}</td>
                <td className="p-2">{sensor.name}</td>
                <td className="p-2">{sensor.location}</td>
                <td className="p-2">{sensor.distance}</td>
                <td className="p-2">{sensor.status}</td>
                <td className="p-2 text-blue-500 cursor-pointer hover:underline">View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
