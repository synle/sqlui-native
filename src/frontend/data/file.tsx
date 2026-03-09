import CsvEngine from "json-2-csv";

/**
 * Downloads a text string as a file in the browser.
 * @param downloadFileName - The name for the downloaded file.
 * @param content - The text content to download.
 * @param mimeType - The MIME type of the content (defaults to "text/csv").
 */
export function downloadText(downloadFileName: string, content: string, mimeType = "text/csv") {
  const encodedContent = `data:${mimeType};charset=utf-8,${content}`;
  const encodedUri = encodeURI(encodedContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click(); // This will download the data file named "my_data.csv".
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
  CsvEngine.json2csv(data, (err, newCsv) => {
    if (!err && newCsv) {
      downloadText(downloadFileName, newCsv, "text/csv");
    }
  });
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
