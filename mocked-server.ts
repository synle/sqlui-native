import bodyParser from 'body-parser';
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { setUpDataEndpoints } from './commons/Endpoints';
import { SqluiCore } from './typings';

const port = 3001;

const app = express();

const upload = multer({ dest: './upload' });

app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json({ limit: '50mb' })); // parse application/json

// strictly used for the mocked server to upload and read the content of the files
app.post('/api/file', upload.single('file'), async (req, res) => {
  try{
    //@ts-ignore
    res.status(200).send(fs.readFileSync(req.file.path, {encoding: 'utf-8'}));
  } catch(err){
    res.status(400).send('Cannot read the file')
  }
});


setUpDataEndpoints(app);

app.listen(port, () => {
  console.log(`SQLUI Native Mocked Server started and listening on port ${port}`);
});
