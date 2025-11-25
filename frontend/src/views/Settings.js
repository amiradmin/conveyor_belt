import React from 'react';


export default function Settings() {
const settingsOptions = [
{ id: 1, name: 'حد آستانه', description: 'تنظیم محدودیت برای سنسورها و نوارها' },
{ id: 2, name: 'هشدارها', description: 'پیکربندی اعلان‌ها و آلارم‌ها' },
{ id: 3, name: 'مدیریت کاربران', description: 'افزودن یا حذف کاربران داشبورد' },
{ id: 4, name: 'پیکربندی دستگاه', description: 'تنظیم سنسورها و دستگاه‌های متصل' }
];


return (
<div className="p-6">
<h1 className="text-2xl font-bold mb-4">تنظیمات</h1>
<div className="bg-white shadow rounded-2xl p-4">
<table className="w-full text-right">
<thead>
<tr>
<th className="p-2">شناسه</th>
<th className="p-2">گزینه</th>
<th className="p-2">توضیحات</th>
<th className="p-2">عملیات</th>
</tr>
</thead>
<tbody>
{settingsOptions.map(option => (
<tr key={option.id} className="border-t">
<td className="p-2">{option.id}</td>
<td className="p-2">{option.name}</td>
<td className="p-2">{option.description}</td>
<td className="p-2 text-blue-500 cursor-pointer hover:underline">ویرایش</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
);
}