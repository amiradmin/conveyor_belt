import { toPersianNumber } from './persianUtils';

export const formatTime = (date) => {
  return toPersianNumber(date.toLocaleTimeString('fa-IR'));
};

export const formatDate = (date) => {
  return date.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};