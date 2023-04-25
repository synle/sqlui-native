import * as sessionUtils from 'src/common/utils/sessionUtils';

describe('sessionUtils', () => {
  const w1 = 'window_1';
  const w2 = 'window_2';
  const w3 = 'window_3';
  const w4 = 'window_4';
  const s1 = 'session_1';
  const s2 = 'session_2';
  const s3 = 'session_3';
  const s4 = 'session_4';

  beforeEach(() => {
    sessionUtils.reset();
  });

  test('single window scenario', async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_1',
    });

    sessionUtils.open(w1, s2);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_2',
    });

    sessionUtils.open(w1, s3);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_3',
    });

    expect(sessionUtils.listSessionIds()).toEqual(['session_3']);

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});
  });

  test('multiple window scenario', async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_1',
    });

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s2);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_2',
    });

    sessionUtils.open(w2, s3);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_2',
      window_2: 'session_3',
    });

    sessionUtils.open(w3, s1);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_2',
      window_2: 'session_3',
      window_3: 'session_1',
    });

    expect(sessionUtils.listSessionIds()).toEqual(['session_2', 'session_3', 'session_1']);

    sessionUtils.close(w3);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_2',
      window_2: 'session_3',
    });

    sessionUtils.close(w2);
    expect(sessionUtils.get()).toEqual({
      window_1: 'session_2',
    });

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});
  });

  test('open', async () => {
    expect(sessionUtils.get()).toEqual({});

    let isSessionCreated = false;
    isSessionCreated = sessionUtils.open(w1, s1);
    expect(isSessionCreated).toEqual(true);
    isSessionCreated = sessionUtils.open(w2, s2);
    expect(isSessionCreated).toEqual(true);
    isSessionCreated = sessionUtils.open(w3, s3);
    expect(isSessionCreated).toEqual(true);
    isSessionCreated = sessionUtils.open(w4, s3);
    expect(isSessionCreated).toEqual(false);
  });

  test('getWindowIdBySessionId', async () => {
    expect(sessionUtils.get()).toEqual({});

    let isSessionCreated = false;
    isSessionCreated = sessionUtils.open(w1, s1);
    isSessionCreated = sessionUtils.open(w2, s2);
    isSessionCreated = sessionUtils.open(w3, s3);

    expect(sessionUtils.getWindowIdBySessionId(s1)).toEqual('window_1');
    expect(sessionUtils.getWindowIdBySessionId(s2)).toEqual('window_2');
    expect(sessionUtils.getWindowIdBySessionId(s3)).toEqual('window_3');
    expect(sessionUtils.getWindowIdBySessionId(s4)).toEqual(undefined);
  });
});