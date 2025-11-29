// src/utils/farsiNumbers.js
export const toFarsiNumber = (number) => {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return number.toString().replace(/\d/g, x => farsiDigits[x]);
};

export const formatCurrency = (amount) => {
  return `${toFarsiNumber(amount.toLocaleString())} تومان`;
};