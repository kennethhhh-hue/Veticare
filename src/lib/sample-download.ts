type CsvCell = string | number | boolean | null | undefined;

export function downloadCsv(filename: string, rows: Array<Record<string, CsvCell>>) {
  if (rows.length === 0) return false;

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: CsvCell) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}
