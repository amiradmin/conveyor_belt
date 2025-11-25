import React from 'react';


export default function Cameras() {
const cameras = [
{ id: 1, name: 'دوربین X1', type: 'HD', status: 'فعال' },
{ id: 2, name: 'دوربین X2', type: '4K', status: 'غیرفعال' },
{ id: 3, name: 'دوربین Y1', type: 'حرارتی', status: 'فعال' }
];


return (
<div className="p-6">
<h1 className="text-2xl font-bold mb-4">دوربین‌ها</h1>
<div className="bg-white shadow rounded-2xl p-4">
<table className="w-full text-right">
<thead>
<tr>
<th className="p-2">شناسه</th>
<th className="p-2">نام</th>
<th className="p-2">نوع</th>
<th className="p-2">وضعیت</th>
<th className="p-2">عملیات</th>
</tr>
</thead>
<tbody>
{cameras.map(cam => (
<tr key={cam.id} className="border-t">
<td className="p-2">{cam.id}</td>
<td className="p-2">{cam.name}</td>
<td className="p-2">{cam.type}</td>
<td className="p-2">{cam.status}</td>
<td className="p-2 text-blue-500 cursor-pointer hover:underline">مشاهده</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
);
}