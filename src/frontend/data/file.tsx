export function downloadText(downloadFileName: string, content: string, mimeType = 'text/csv') {
  let encodedContent = `data:${mimeType};charset=utf-8,${content}`;
  let encodedUri = encodeURI(encodedContent);
  let link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click(); // This will download the data file named "my_data.csv".
}

export function downloadBlob(downloadFileName: string, blobContent: string) {
  let link = document.createElement('a');
  link.setAttribute('href', blobContent);
  link.setAttribute('download', downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click();
}
