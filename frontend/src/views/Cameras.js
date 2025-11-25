import React from "react";

export default function Cameras() {
  const cameras = [
    { id: 1, name: "Camera X1", type: "HD", status: "Online" },
    { id: 2, name: "Camera X2", type: "4K", status: "Offline" },
    { id: 3, name: "Camera Y1", type: "Thermal", status: "Online" }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Cameras</h1>
      <div className="bg-white shadow rounded-2xl p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cameras.map((cam) => (
              <tr key={cam.id} className="border-t">
                <td className="p-2">{cam.id}</td>
                <td className="p-2">{cam.name}</td>
                <td className="p-2">{cam.type}</td>
                <td className="p-2">{cam.status}</td>
                <td className="p-2 text-blue-500 cursor-pointer hover:underline">View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
