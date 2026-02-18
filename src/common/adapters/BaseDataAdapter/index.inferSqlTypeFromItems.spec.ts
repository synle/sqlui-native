import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";

describe("BaseDataAdapter", () => {
  describe("inferSqlTypeFromItems", () => {
    const mockedObjects = [
      {
        cb: 22.22,
        cd: "asdsadsfdsafsadfdsa",
      },
      {
        ca: 115,
        cc: true,
        cd: "asdsadsfdsafsadfdsa",
      },
      {
        n: {
          na: "aa",
          nb: 22,
          nc: {
            nc1: 99,
            nc2: true,
          },
        },
      },
    ];

    test.each([
      ["mysql"],
      ["mariadb"],
      ["mssql"],
      ["postgres"],
      ["sqlite"],
      ["cassandra"],
      ["mongodb"],
      ["redis"],
      ["cosmosdb"],
      ["aztable"],
    ])("inferSqlTypeFromItems work correctly for dialect=%s", (inputDialect) => {
      const actual = BaseDataAdapter.inferSqlTypeFromItems(mockedObjects, inputDialect);
      expect(actual).toMatchSnapshot();
    });
  });
});
