export function formatCurrency(amount: number, currencyCode: string) {
  // Untuk mata uang yang tidak pakai sen/koma di belakang (seperti Rupiah & Yen)
  const noDecimal = ['IDR', 'JPY', 'KRW', 'VND'].includes(currencyCode);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: noDecimal ? 0 : 2,
    minimumFractionDigits: noDecimal ? 0 : 2,
  }).format(amount);
}

export function getCurrencySymbol(currencyCode: string) {
  // Mengekstrak hanya simbolnya saja (contoh: "USD" jadi "$", "IDR" jadi "Rp")
  try {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode });
    const parts = formatter.formatToParts(0);
    const symbolPart = parts.find(part => part.type === 'currency');
    return symbolPart ? symbolPart.value : currencyCode;
  } catch (e) {
    return currencyCode;
  }
}