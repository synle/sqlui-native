import CsvEngine from 'json-2-csv';

export function downloadText(downloadFileName: string, content: string, mimeType = 'text/csv') {
  let encodedContent = `data:${mimeType};charset=utf-8,${content}`;
  let encodedUri = encodeURI(encodedContent);
  let link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click(); // This will download the data file named "my_data.csv".
}

export function downloadJSON(downloadFileName: string, data) {
  downloadText(downloadFileName, JSON.stringify(data, null, 2), 'text/json');
}


export function downloadCsv(downloadFileName: string, data) {
  CsvEngine.json2csv(data, (err, newCsv) => {
    if (!err && newCsv) {
      downloadText(downloadFileName, newCsv, 'text/csv');
    }
  });
}

export function downloadBlob(downloadFileName: string, blobContent: string) {
  let link = document.createElement('a');
  link.setAttribute('href', blobContent);
  link.setAttribute('download', downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click();
}
