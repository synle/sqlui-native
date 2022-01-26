// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
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
if(process.env.NODE_ENV !== "development"){
    window.fetch = (url, options) => {
        return new Promise((resolve, reject) => {
            const requestId = `requestId.${Date.now()}`;
            ipcRenderer.once(requestId, (event, data) => {
                reject(data);
            });
            ipcRenderer.send('sqluiNative/fetch', {requestId, url, options});
        }).catch(e => {
            debugger
            throw e
        })
    }

}
