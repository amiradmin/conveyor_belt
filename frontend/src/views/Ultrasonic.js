import React from 'react';


export default function Ultrasonic() {
const sensors = [
{ id: 1, name: 'US-01', location: 'منطقه A', distance: '22 cm', status: 'فعال' },
{ id: 2, name: 'US-02', location: 'منطقه B', distance: '18 cm', status: 'فعال' },
{ id: 3, name: 'US-03', location: 'منطقه C', distance: '25 cm', status: 'غیرفعال' }
];


return (
<div className="p-6">
<h1 className="text-2xl font-bold mb-4">سنسورهای آلتراسونیک</h1>
<div className="bg-white shadow rounded-2xl p-4">
<table className="w-full text-right">
<thead>
<tr>
<th className="p-2">شناسه</th>
<th className="p-2">نام</th>
<th className="p-2">مکان</th>
<th className="p-2">فاصله</th>
<th className="p-2">وضعیت</th>
<th className="p-2">عملیات</th>
</tr>
</thead>
<tbody>
{sensors.map(sensor => (
<tr key={sensor.id} className="border-t">
<td className="p-2">{sensor.id}</td>
<td className="p-2">{sensor.name}</td>
<td className="p-2">{sensor.location}</td>
<td className="p-2">{sensor.distance}</td>
<td className="p-2">{sensor.status}</td>
<td className="p-2 text-blue-500 cursor-pointer hover:underline">مشاهده</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
);
}