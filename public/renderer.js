// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
try {
  if (process.env.NODE_ENV !== 'development') {
    const ipcRenderer = require('electron').ipcRenderer;
    window.ipcRenderer = ipcRenderer;

    // in the child
    // const send =(callback, waitingEventName= 'event-name-reply')=>{
    //     ipcRenderer.once(waitingEventName, (event, data) => {
    //         callback(data);
    //     });
    //     ipcRenderer.send('sqluiNative/fetch', {waitingEventName});
    // };

    // send((value)=>{
    //     console.log(value);
    // });

    // here we are polyfilling fetch with ipcRenderer

    window.fetch = (url, options) => {
      return new Promise((resolve, reject) => {
        const requestId = `requestId.${Date.now()}.${Math.floor(
          Math.random() * 10000000000000000,
        )}`;
        ipcRenderer.once(requestId, (event, data) => {
          const { ok, text } = data;

          try {
            console.log(
              '>> Network',
              ok ? 'Success' : 'Error:',
              options.method || 'get',
              url,
              JSON.parse(text),
            );
          } catch (err) {
            console.log(
              '>> Network',
              ok ? 'Success' : 'Error:',
              options.method || 'get',
              url,
              text,
            );
          }

          data.ok
            ? resolve({
                ok,
                text: () => text,
              })
            : reject({
                ok,
                text: () => text,
              });
        });
        ipcRenderer.send('sqluiNativeEvent/fetch', { requestId, url, options });
      });
    };
  }
} catch (err) {}
