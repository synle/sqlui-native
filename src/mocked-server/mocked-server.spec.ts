import supertest from 'supertest';
import { app } from 'src/mocked-server/mocked-server';

const requestWithSupertest = supertest(app);

describe('Configs', () => {
  it('GET /api/configs should work', async () => {
    const res = await requestWithSupertest.get('/api/configs');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('storageDir');
    expect(res.body).toHaveProperty('isElectron');
  });
});


describe('Sessions', () => {
  const mockedSessionId = `mocked-session-id.${Date.now()}`;
  const mockedSessionValue1 = {
    "id":mockedSessionId,
    "name":"Mocked Session Name Value 1"
  }

  const mockedSessionValue2 = {
    "id":mockedSessionId,
    "name":"Mocked Session Name Value 2"
  }

  const mockedConnection1 = {
      "name":"mysql Connection - 7/18/2022",
      "connection":"mysql://root:password@localhost:3306"}

  const commonHeaders = {
  "sqlui-native-session-id":mockedSessionId,
  "sqlui-native-window-id": "mocked-window-id"
};



  it('Simple scenario Create Session / Get Session', async () => {
    // here we create the session
    let res: any;
    res = await requestWithSupertest.put(`/api/session/${mockedSessionId}`).send(mockedSessionValue1);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get('/api/sessions');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toContainEqual(mockedSessionValue1);
    expect(res.body.length > 0).toEqual(true);


    // rename the session
    res = await requestWithSupertest.put(`/api/session/${mockedSessionId}`).send(mockedSessionValue2);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get('/api/sessions');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toContainEqual(mockedSessionValue2);
  });

  it('Simple Connection & Query', async () => {
    let res: any;
    res = await requestWithSupertest.post('/api/connection').set(commonHeaders).send(mockedConnection1);
    expect(res.status).toEqual(201);
    expect(res.body).toEqual(expect.objectContaining(mockedConnection1));
  });
});
