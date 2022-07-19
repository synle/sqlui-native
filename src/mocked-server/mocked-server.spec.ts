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
