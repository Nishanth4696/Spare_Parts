export function paiseToRupees(paise) {
  return (Number(paise || 0) / 100).toFixed(2);
}

export function formatMoney(paise) {
  return `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function rupeesToPaise(rupees) {
  return Math.round(Number(rupees || 0) * 100);
}
