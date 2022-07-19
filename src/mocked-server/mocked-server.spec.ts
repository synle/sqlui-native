import supertest from 'supertest';
import { app } from 'src/mocked-server/mocked-server';

const requestWithSupertest = supertest(app);

describe('Configs', () => {
  test('GET /api/configs should work', async () => {
    const res = await requestWithSupertest.get(`/api/configs`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toHaveProperty('storageDir');
    expect(res.body).toHaveProperty('isElectron');
  });
});

describe('Sessions', () => {
  const mockedSessionId = `mocked-session-id.${Date.now()}`;

  const mockedConnection1 = {
    name: 'mysql Connection - 7/18/2022',
    connection: 'mysql://root:password@localhost:3306',
  };

  const mockedQueryId1 = `mocked-query-id-1.${Date.now()}`;
  const mockedQueryId2 = `mocked-query-id-2.${Date.now()}`;

  const mockedQueryValue1 = {
    id: mockedQueryId1,
    name: 'Query 1',
    sql: '--query one'
  };

  const mockedQueryValue2 = {
    id: mockedQueryId2,
    name: 'Query 2',
    sql: '--query two',
    selected: true,
  };

  const commonHeaders = {
    'sqlui-native-session-id': mockedSessionId,
    'sqlui-native-window-id': 'mocked-window-id',
  };

  test('Simple scenario Create Session / Get Session', async () => {
    const mockedSessionValue1 = {
      id: mockedSessionId,
      name: 'Mocked Session Name Value 1',
    };

    const mockedSessionValue2 = {
      id: mockedSessionId,
      name: 'Mocked Session Name Value 2',
    };

    let res: any;
    res = await requestWithSupertest
      .put(`/api/session/${mockedSessionId}`)
      .send(mockedSessionValue1);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get(`/api/sessions`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toContainEqual(mockedSessionValue1);
    expect(res.body.length > 0).toEqual(true);
    // rename the session
    res = await requestWithSupertest
      .put(`/api/session/${mockedSessionId}`)
      .send(mockedSessionValue2);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get(`/api/sessions`);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toContainEqual(mockedSessionValue2);
  });

  test('Simple Connection', async () => {
    let res: any;

    // add a connection
    res = await requestWithSupertest
      .post(`/api/connection`)
      .set(commonHeaders)
      .send(mockedConnection1);
    expect(res.status).toEqual(201);
    expect(res.body).toEqual(expect.objectContaining(mockedConnection1));
    const mockedConnectionId1 = res.body.id;
    expect(mockedConnectionId1.length > 0).toBe(true)

    // for simplicity, we will only assert this response headers once
    expect(res.headers["sqlui-native-session-id"]).toEqual(commonHeaders["sqlui-native-session-id"])
    expect(res.headers["sqlui-native-window-id"]).toEqual(commonHeaders["sqlui-native-window-id"])

    // delete connection
    res = await requestWithSupertest
      .delete(`/api/connection/${mockedConnectionId1}`)
      .set(commonHeaders);
    expect(res.status).toEqual(202);
  });

  test('Simple Queries', async () => {
    let res: any;

    // add 2 queries
    res = await requestWithSupertest
      .put(`/api/query/${mockedQueryValue1.id}`)
      .set(commonHeaders)
      .send(mockedQueryValue1);
    expect(res.status).toEqual(202);
    expect(res.body.id).toEqual(mockedQueryValue1.id);

    res = await requestWithSupertest
      .put(`/api/query/${mockedQueryValue2.id}`)
      .set(commonHeaders)
      .send(mockedQueryValue2);
    expect(res.status).toEqual(202);
    expect(res.body.id).toEqual(mockedQueryValue2.id);

    // check the created queries
    res = await requestWithSupertest
      .get(`/api/queries`)
      .set(commonHeaders)
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(2);

    // delete one query and test
    res = await requestWithSupertest
      .delete(`/api/query/${mockedQueryValue1.id}`)
      .set(commonHeaders);
    expect(res.status).toEqual(202);

    // check the queries
    res = await requestWithSupertest
      .get(`/api/queries`)
      .set(commonHeaders)
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
  });

  test('DELETE and Cleaning up the mocked session', async () => {
    let res: any;

    // check the session
    res = await requestWithSupertest.get(`/api/sessions`).set(commonHeaders);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    let sizeBeforeDeleteSesssion = res.body.length;

    // delete the old session
    res = await requestWithSupertest.delete(`/api/session/${mockedSessionId}`);
    expect(res.status).toEqual(202);

    // check the session
    res = await requestWithSupertest.get(`/api/sessions`).set(commonHeaders);
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body.length).toEqual(sizeBeforeDeleteSesssion - 1);
  });
});
