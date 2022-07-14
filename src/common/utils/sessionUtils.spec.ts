import * as sessionUtils from 'src/common/utils/sessionUtils';

describe('sessionUtils', () => {
  const w1 = 'window_1';
  const w2 = 'window_2';
  const w3 = 'window_3';
  const s1 = 'session_1';
  const s2 = 'session_2';
  const s3 = 'session_3';

  beforeEach(() => {
    sessionUtils.reset();
  })

  test('single window scenario', async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_1",
}
`);

    sessionUtils.open(w1, s2);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_2",
}
`);

    sessionUtils.open(w1, s3);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_3",
}
`);

    expect(sessionUtils.listSessionIds()).toMatchInlineSnapshot(`
Array [
  "session_3",
]
`);

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});
  });

  test('multiple window scenario', async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_1",
}
`);

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`Object {}`);

    sessionUtils.open(w1, s2);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_2",
}
`);

    sessionUtils.open(w2, s3);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_2",
  "window_2": "session_3",
}
`);

    sessionUtils.open(w3, s1);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_2",
  "window_2": "session_3",
  "window_3": "session_1",
}
`);

    expect(sessionUtils.listSessionIds()).toMatchInlineSnapshot(`
Array [
  "session_2",
  "session_3",
  "session_1",
]
`);

    sessionUtils.close(w3);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_2",
  "window_2": "session_3",
}
`);

    sessionUtils.close(w2);
    expect(sessionUtils.get()).toMatchInlineSnapshot(`
Object {
  "window_1": "session_2",
}
`);

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});
  });
});