import React from "react";

export default function Settings() {
  const settingsOptions = [
    { id: 1, name: "Thresholds", description: "Set limits for sensors and belts." },
    { id: 2, name: "Alerts", description: "Configure alarm notifications." },
    { id: 3, name: "User Management", description: "Add or remove dashboard users." },
    { id: 4, name: "Device Configuration", description: "Configure connected devices and sensors." }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="bg-white shadow rounded-2xl p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Option</th>
              <th className="p-2">Description</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settingsOptions.map((option) => (
              <tr key={option.id} className="border-t">
                <td className="p-2">{option.id}</td>
                <td className="p-2">{option.name}</td>
                <td className="p-2">{option.description}</td>
                <td className="p-2 text-blue-500 cursor-pointer hover:underline">Edit</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}