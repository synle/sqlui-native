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
  const mockedSessionValue = {
    "id":mockedSessionId,
    "name":"Mocked Session Name"
  }

  it('Simple scenario', async () => {
    let res: any;
    res = await requestWithSupertest.put(`/api/session/${mockedSessionId}`).send(mockedSessionValue);
    expect(res.status).toEqual(202);

    res = await requestWithSupertest.get('/api/sessions');
    expect(res.status).toEqual(200);
    expect(res.type).toEqual(expect.stringContaining('json'));
    expect(res.body).toContainEqual(mockedSessionValue);
  });
});
