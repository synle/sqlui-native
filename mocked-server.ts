import express from 'express';
import bodyParser from 'body-parser';
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
} from './commons/utils/RelationalDatabaseEngine';
import ConnectionUtils from './commons/utils/ConnectionUtils';
import { setUpDataEndpoints } from './commons/utils/EndpointUtils';
import { SqluiCore } from './typings';

const port = 3001;
const app = express();

app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json({ limit: '50mb' })); // parse application/json

setUpDataEndpoints(app);

app.listen(port, () => {
  console.log(`SQLUI Native Mocked Server started and listening on port ${port}`);
});
