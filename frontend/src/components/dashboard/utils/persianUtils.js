export const toPersianNumber = (number) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return number?.toString()?.replace(/\d/g, x => persianDigits[x]) || '۰';
};

export const getHealthColor = (health) => {
  switch (health) {
    case 'excellent': return 'text-green-600 bg-green-100';
    case 'good': return 'text-blue-600 bg-blue-100';
    case 'fair': return 'text-yellow-600 bg-yellow-100';
    case 'poor': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const getHealthText = (health) => {
  switch (health) {
    case 'excellent': return 'عالی';
    case 'good': return 'خوب';
    case 'fair': return 'متوسط';
    case 'poor': return 'نیاز به توجه';
    default: return 'نامشخص';
  }
};