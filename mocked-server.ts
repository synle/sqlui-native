import bodyParser from 'body-parser';
import express from 'express';
import multer from 'multer';
import { setUpDataEndpoints } from './commons/Endpoints';
import { SqluiCore } from './typings';

const port = 3001;

const app = express();

const upload = multer({ dest: './upload' });

app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json({ limit: '50mb' })); // parse application/json

// strictly used for the mocked server to upload and read the content of the files
app.post('/api/file', upload.single('file'), async (req, res) => {
  //@ts-ignore
  const file = req.file;
  res.status(200).send(file);
});


setUpDataEndpoints(app);

app.listen(port, () => {
  console.log(`SQLUI Native Mocked Server started and listening on port ${port}`);
});
