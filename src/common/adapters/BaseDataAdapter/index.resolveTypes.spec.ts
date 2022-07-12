import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

describe('BaseDataAdapter', () => {
  describe('resolveTypes', () => {
    test('primitive types only', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        _id: '620d36396027dda455d46763',
        name: 'sy le',
        zipcode: 95037,
      });
      expect(actual).toMatchSnapshot();
    });

    test('arrays', async () => {
      const actual = BaseDataAdapter.resolveTypes({ genre: ['aa', 'bb', 'cc'] });
      expect(actual).toMatchSnapshot();
    });

    test('nested objects', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        _id: '620d36396027dda455d46763',
        name: 'sy le',
        location: { zip: 95037, county: { name: 'santa clara' } },
        genre: ['aa', 'bb', 'cc'],
      });
      expect(actual).toMatchSnapshot();
    });


    test('complex objects with null', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        "id": 321,
        "is_locked": 0,
        "contact_id": null,
        location: { zip: null } ,
      });
      expect(actual).toMatchSnapshot();
    });
  });
});
