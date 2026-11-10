/**
 * Export data to Excel (CSV format with BOM for proper encoding)
 * @param data Array of objects to export
 * @param filename Filename without extension
 */
export function exportToExcel(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Escape and format cell values for CSV
  const formatCell = (value: any): string => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV content
  const csvRows = [
    headers.join(";"), // Use semicolon for better Excel compatibility in Portuguese locale
    ...data.map(row => 
      headers.map(header => formatCell(row[header])).join(";")
    )
  ];

  // Add BOM for UTF-8 encoding (important for Excel to recognize accented characters)
  const BOM = "\uFEFF";
  const csvContent = BOM + csvRows.join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/** Faz o download de um objeto como arquivo JSON formatado. */
export function exportToJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Achata um objeto de exportação LGPD em linhas (secao / campo / valor)
 * para gerar um CSV legível a partir do JSON retornado pelo backend.
 */
export function flattenExportPayload(payload: Record<string, unknown>): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  const push = (secao: string, indice: string, campo: string, valor: unknown) => {
    if (valor === null || valor === undefined || valor === "") return;
    rows.push({
      Secao: secao,
      Registro: indice,
      Campo: campo,
      Valor: typeof valor === "object" ? JSON.stringify(valor) : String(valor),
    });
  };

  Object.entries(payload).forEach(([secao, valor]) => {
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        if (item && typeof item === "object") {
          Object.entries(item as Record<string, unknown>).forEach(([k, v]) => push(secao, String(i + 1), k, v));
        } else {
          push(secao, String(i + 1), secao, item);
        }
      });
    } else if (valor && typeof valor === "object") {
      Object.entries(valor as Record<string, unknown>).forEach(([k, v]) => push(secao, "1", k, v));
    } else {
      push(secao, "1", secao, valor);
    }
  });

  return rows;
}
