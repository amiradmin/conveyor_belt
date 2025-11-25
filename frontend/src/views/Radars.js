import React from 'react';


export default function Radars() {
const radars = [
{ id: 1, model: 'رادار R100', range: '30 متر', status: 'فعال' },
{ id: 2, model: 'رادار R200', range: '45 متر', status: 'فعال' },
{ id: 3, model: 'رادار R300', range: '60 متر', status: 'غیرفعال' }
];


return (
<div className="p-6">
<h1 className="text-2xl font-bold mb-4">رادارها</h1>
<div className="bg-white shadow rounded-2xl p-4">
<table className="w-full text-right">
<thead>
<tr>
<th className="p-2">شناسه</th>
<th className="p-2">مدل</th>
<th className="p-2">برد</th>
<th className="p-2">وضعیت</th>
<th className="p-2">عملیات</th>
</tr>
</thead>
<tbody>
{radars.map(radar => (
<tr key={radar.id} className="border-t">
<td className="p-2">{radar.id}</td>
<td className="p-2">{radar.model}</td>
<td className="p-2">{radar.range}</td>
<td className="p-2">{radar.status}</td>
<td className="p-2 text-blue-500 cursor-pointer hover:underline">مشاهده</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
);
}