import * as formatter from 'src/frontend/utils/formatter';

describe('formatter', () => {
  describe('formatJS', () => {
    test('should work', async () => {
      const actual = formatter.formatJS(
        `db.collection("sy-collection-1a").distinct("commute",{_id:"",commute:"","company.location":"","company.name":"",location:"",name:"",zip:""});`,
      );
      expect(actual).toMatchInlineSnapshot(
        `"db.collection(\\"sy-collection-1a\\").distinct(\\"commute\\",{_id:\\"\\",commute:\\"\\",\\"company.location\\":\\"\\",\\"company.name\\":\\"\\",location:\\"\\",name:\\"\\",zip:\\"\\"});"`,
      );
    });
  });

  describe('formatSQL', () => {
    test('should work', async () => {
      const actual = formatter.formatSQL(
        `SELECT AlbumId, ArtistId, Title FROM albums WHERE Title = 'abc' LIMIT 100`,
      );
      expect(actual).toMatchInlineSnapshot(`
"SELECT
  AlbumId,
  ArtistId,
  Title
FROM
  albums
WHERE
  Title = 'abc'
LIMIT
  100"
`);
    });
  });
});
