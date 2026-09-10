export function normalizeDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  // If it's already yyyy-MM-dd, keep it if it's valid
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year < 1000 || year > 9999) return null;
    return dateString;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 1000 || year > 9999) return null;

  const yyyy = year;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

export function formatHistoricDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime()) || date.getFullYear() < 1000) return "—";
  return date.toLocaleString();
}

export function cleanHistoricMessageText(message: string | null | undefined): string {
  if (!message) return "";
  // Procura por datas no formato YYYY-MM-DD
  return message.replace(/\b(\d{4})-\d{2}-\d{2}\b/g, (match, year) => {
    if (parseInt(year, 10) < 1000) return "—";
    return match;
  });
}
