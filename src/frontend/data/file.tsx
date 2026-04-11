import CsvEngine from "json-2-csv";

/**
 * Downloads a text string as a file in the browser.
 * @param downloadFileName - The name for the downloaded file.
 * @param content - The text content to download.
 * @param mimeType - The MIME type of the content (defaults to "text/csv").
 */
export function downloadText(downloadFileName: string, content: string, mimeType = "text/csv") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads data as a JSON file.
 * @param downloadFileName - The name for the downloaded file.
 * @param data - The data to serialize as JSON.
 */
export function downloadJSON(downloadFileName: string, data) {
  downloadText(downloadFileName, JSON.stringify(data, null, 2), "text/json");
}

/**
 * Downloads data as a CSV file using json-2-csv conversion.
 * @param downloadFileName - The name for the downloaded file.
 * @param data - The array of objects to convert to CSV.
 */
export function downloadCsv(downloadFileName: string, data) {
  const csv = CsvEngine.json2csv(data);
  downloadText(downloadFileName, csv, "text/csv");
}

/**
 * Downloads a blob URL as a file.
 * @param downloadFileName - The name for the downloaded file.
 * @param blobContent - The blob URL to download.
 */
export function downloadBlob(downloadFileName: string, blobContent: string) {
  const link = document.createElement("a");
  link.setAttribute("href", blobContent);
  link.setAttribute("download", downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click();
}
