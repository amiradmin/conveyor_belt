// src/components/roi/ROICalculator.jsx
const ROICalculator = () => {
  return (
    <div className="bg-gradient-to-l from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
      <h3 className="text-2xl font-bold mb-4">محاسبه سودآوری سیستم</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-3xl font-bold">۴۵٪</div>
          <div className="text-green-100">کاهش هزینه تعمیرات</div>
        </div>
        <div>
          <div className="text-3xl font-bold">۲.۱M</div>
          <div className="text-green-100">صرفه جویی سالانه (تومان)</div>
        </div>
        <div>
          <div className="text-3xl font-bold">۶ ماه</div>
          <div className="text-green-100">بازگشت سرمایه</div>
        </div>
        <div>
          <div className="text-3xl font-bold">۹۹٪</div>
          <div className="text-green-100">دقت تشخیص مشکلات</div>
        </div>
      </div>
    </div>
  );
};