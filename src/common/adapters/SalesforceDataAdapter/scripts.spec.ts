import { describe, expect, test } from "vitest";
import {
  ConcreteDataScripts,
  getBulkInsert,
  getCount,
  getCurrentUser,
  getDelete,
  getDescribeApi,
  getDescribeGlobal,
  getDescribeObject,
  getGroupBy,
  getInsert,
  getListCustomObjects,
  getListStandardObjects,
  getOrgIdentity,
  getOrgLimits,
  getRecentAccounts,
  getRecentContacts,
  getRecentOpportunities,
  getRecentRecords,
  getSearchByName,
  getSelectAllColumns,
  getSelectByDate,
  getSelectById,
  getSelectSpecificColumns,
  getSoslSearch,
  getSoslSearchMultiObject,
  getSubquery,
  getUpdate,
  getUpdateWithValues,
  getUpsert,
  SFDC_ADAPTER_PREFIX,
} from "src/common/adapters/SalesforceDataAdapter/scripts";

const tableInput = {
  dialect: "sfdc",
  connectionId: "conn1",
  databaseId: "default",
  tableId: "Account",
  querySize: 200,
  columns: [
    { name: "Id", type: "id", primaryKey: true },
    { name: "Name", type: "string" },
    { name: "Industry", type: "string" },
  ],
} as any;

const connectionInput = {
  dialect: "sfdc",
  connectionId: "conn1",
} as any;

describe("SalesforceDataAdapter scripts", () => {
  describe("SFDC_ADAPTER_PREFIX", () => {
    test("should equal conn", () => {
      expect(SFDC_ADAPTER_PREFIX).toBe("conn");
    });
  });

  // ============================================================
  // SOQL Query Templates
  // ============================================================

  describe("getSelectAllColumns", () => {
    test("returns object with label and query", () => {
      const result = getSelectAllColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select All Columns");
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("Id");
      expect(result!.query).toContain("Name");
      expect(result!.query).toContain("Industry");
      expect(result!.query).toContain("FROM Account");
      expect(result!.query).toContain("LIMIT 200");
    });
  });

  describe("getSelectById", () => {
    test("returns object with label and query", () => {
      const result = getSelectById(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select By Id");
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("FROM Account");
      expect(result!.query).toContain("WHERE Id =");
    });
  });

  describe("getSelectSpecificColumns", () => {
    test("returns object with label and query", () => {
      const result = getSelectSpecificColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select Specific Columns");
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("FROM Account");
      expect(result!.query).toContain("LIMIT 200");
    });

    test("returns undefined when no columns", () => {
      const inputNoColumns = { ...tableInput, columns: undefined } as any;
      const result = getSelectSpecificColumns(inputNoColumns);
      expect(result).toBeUndefined();
    });
  });

  describe("getCount", () => {
    test("returns object with label and query", () => {
      const result = getCount(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Count");
      expect(result!.query).toContain("SELECT COUNT()");
      expect(result!.query).toContain("FROM Account");
    });
  });

  describe("getGroupBy", () => {
    test("returns object with label and query", () => {
      const result = getGroupBy(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Group By");
      expect(result!.query).toContain("GROUP BY");
      expect(result!.query).toContain("FROM Account");
      expect(result!.query).toContain("COUNT(Id)");
    });

    test("returns undefined when no columns", () => {
      const inputNoColumns = { ...tableInput, columns: undefined } as any;
      const result = getGroupBy(inputNoColumns);
      expect(result).toBeUndefined();
    });
  });

  describe("getSearchByName", () => {
    test("returns object with label and query", () => {
      const result = getSearchByName(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Search By Name");
      expect(result!.query).toContain("WHERE Name LIKE");
      expect(result!.query).toContain("FROM Account");
      expect(result!.query).toContain("LIMIT 200");
    });
  });

  describe("getRecentRecords", () => {
    test("returns object with label and query", () => {
      const result = getRecentRecords(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Recent Records");
      expect(result!.query).toContain("ORDER BY CreatedDate DESC");
      expect(result!.query).toContain("FROM Account");
    });
  });

  describe("getSelectByDate", () => {
    test("returns object with label and query", () => {
      const result = getSelectByDate(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Date Range");
      expect(result!.query).toContain("LAST_N_DAYS:7");
      expect(result!.query).toContain("FROM Account");
    });
  });

  describe("getSubquery", () => {
    test("returns object with label and query", () => {
      const result = getSubquery(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Subquery");
      expect(result!.query).toContain("FROM Account");
      expect(result!.query).toContain("FROM Contacts");
    });
  });

  describe("getDescribeObject", () => {
    test("returns object with label and query", () => {
      const result = getDescribeObject(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Describe Object");
      expect(result!.query).toContain("FieldDefinition");
      expect(result!.query).toContain("Account");
    });
  });

  // ============================================================
  // SOSL Search Templates
  // ============================================================

  describe("getSoslSearch", () => {
    test("returns object with label and query", () => {
      const result = getSoslSearch(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Search");
      expect(result!.query).toContain("FIND");
      expect(result!.query).toContain("RETURNING Account");
      expect(result!.query).toContain("LIMIT 200");
    });
  });

  describe("getSoslSearchMultiObject", () => {
    test("returns object with label and query", () => {
      const result = getSoslSearchMultiObject(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Search Across Objects");
      expect(result!.query).toContain("FIND");
      expect(result!.query).toContain("Account");
      expect(result!.query).toContain("Contact");
      expect(result!.query).toContain("Lead");
    });
  });

  // ============================================================
  // JS API Templates (Mutations)
  // ============================================================

  describe("getInsert", () => {
    test("returns object with label and query", () => {
      const result = getInsert(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Insert");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".create(");
    });

    test("uses provided value and removes Id", () => {
      const result = getInsert(tableInput, { Id: "abc", Name: "Acme Corp" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("Acme Corp");
      expect(result!.query).not.toContain('"Id"');
    });
  });

  describe("getBulkInsert", () => {
    test("returns undefined when no rows provided", () => {
      const result = getBulkInsert(tableInput);
      expect(result).toBeUndefined();
    });

    test("returns undefined when rows array is empty", () => {
      const result = getBulkInsert(tableInput, []);
      expect(result).toBeUndefined();
    });

    test("returns object with label and query when rows provided", () => {
      const rows = [
        { Id: "1", Name: "Acme" },
        { Id: "2", Name: "Globex" },
      ];
      const result = getBulkInsert(tableInput, rows);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Insert");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".create(");
      expect(result!.query).toContain("Acme");
      expect(result!.query).toContain("Globex");
    });
  });

  describe("getUpdate", () => {
    test("returns object with label and query", () => {
      const result = getUpdate(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Update");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".update(");
      expect(result!.query).toContain("record_id_here");
    });

    test("returns undefined when no columns", () => {
      const inputNoColumns = { ...tableInput, columns: undefined } as any;
      const result = getUpdate(inputNoColumns);
      expect(result).toBeUndefined();
    });
  });

  describe("getUpdateWithValues", () => {
    test("returns object with label and query", () => {
      const result = getUpdateWithValues(tableInput, { Name: "Updated" }, { Id: "rec123" });
      expect(result).toBeDefined();
      expect(result!.label).toContain("Update");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".update(");
      expect(result!.query).toContain("rec123");
      expect(result!.query).toContain("Updated");
    });
  });

  describe("getDelete", () => {
    test("returns object with label and query", () => {
      const result = getDelete(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Delete");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".destroy(");
    });
  });

  describe("getUpsert", () => {
    test("returns object with label and query", () => {
      const result = getUpsert(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Upsert");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".upsert(");
    });

    test("returns undefined when no columns", () => {
      const inputNoColumns = { ...tableInput, columns: undefined } as any;
      const result = getUpsert(inputNoColumns);
      expect(result).toBeUndefined();
    });
  });

  describe("getDescribeApi", () => {
    test("returns object with label and query", () => {
      const result = getDescribeApi(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Describe Object");
      expect(result!.query).toContain("conn.sobject('Account')");
      expect(result!.query).toContain(".describe()");
    });
  });

  // ============================================================
  // Connection-Level Templates
  // ============================================================

  describe("getListCustomObjects", () => {
    test("returns object with label and query", () => {
      const result = getListCustomObjects(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Custom Objects");
      expect(result!.query).toContain("EntityDefinition");
      expect(result!.query).toContain("__c");
    });
  });

  describe("getListStandardObjects", () => {
    test("returns object with label and query", () => {
      const result = getListStandardObjects(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Standard Objects");
      expect(result!.query).toContain("EntityDefinition");
    });
  });

  describe("getCurrentUser", () => {
    test("returns object with label and query", () => {
      const result = getCurrentUser(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Current User");
      expect(result!.query).toContain("FROM User");
    });
  });

  describe("getRecentAccounts", () => {
    test("returns object with label and query", () => {
      const result = getRecentAccounts(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Recent Accounts");
      expect(result!.query).toContain("FROM Account");
    });
  });

  describe("getRecentContacts", () => {
    test("returns object with label and query", () => {
      const result = getRecentContacts(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Recent Contacts");
      expect(result!.query).toContain("FROM Contact");
    });
  });

  describe("getRecentOpportunities", () => {
    test("returns object with label and query", () => {
      const result = getRecentOpportunities(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Recent Opportunities");
      expect(result!.query).toContain("FROM Opportunity");
    });
  });

  describe("getOrgIdentity", () => {
    test("returns object with label and query", () => {
      const result = getOrgIdentity(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Org Identity");
      expect(result!.query).toContain("conn.identity()");
    });
  });

  describe("getDescribeGlobal", () => {
    test("returns object with label and query", () => {
      const result = getDescribeGlobal(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Describe Global");
      expect(result!.query).toContain("conn.describeGlobal()");
    });
  });

  describe("getOrgLimits", () => {
    test("returns object with label and query", () => {
      const result = getOrgLimits(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Org Limits");
      expect(result!.query).toContain("conn.limits()");
    });
  });

  // ============================================================
  // ConcreteDataScripts class
  // ============================================================

  describe("ConcreteDataScripts", () => {
    const scripts = new ConcreteDataScripts();

    test("isDialectSupported returns true for sfdc", () => {
      expect(scripts.isDialectSupported("sfdc" as any)).toBe(true);
    });

    test("isDialectSupported returns false for mysql", () => {
      expect(scripts.isDialectSupported("mysql" as any)).toBe(false);
    });

    test("getIsTableIdRequiredForQuery returns false", () => {
      expect(scripts.getIsTableIdRequiredForQuery()).toBe(false);
    });

    test("getSyntaxMode returns sql", () => {
      expect(scripts.getSyntaxMode()).toBe("sql");
    });

    test("supportMigration returns true", () => {
      expect(scripts.supportMigration()).toBe(true);
    });

    test("supportCreateRecordForm returns true", () => {
      expect(scripts.supportCreateRecordForm()).toBe(true);
    });

    test("supportEditRecordForm returns false", () => {
      expect(scripts.supportEditRecordForm()).toBe(false);
    });

    test("getConnectionStringFormat returns json", () => {
      expect(scripts.getConnectionStringFormat()).toBe("json");
    });

    test("getDialectName returns Salesforce", () => {
      expect(scripts.getDialectName("sfdc" as any)).toBe("Salesforce");
    });

    test("getTableScripts returns array of functions", () => {
      const tableScripts = scripts.getTableScripts();
      expect(tableScripts.length).toBeGreaterThan(0);
    });

    test("getDatabaseScripts returns empty array", () => {
      const dbScripts = scripts.getDatabaseScripts();
      expect(dbScripts).toEqual([]);
    });

    test("getConnectionScripts returns array of functions", () => {
      const connScripts = scripts.getConnectionScripts();
      expect(connScripts.length).toBeGreaterThan(0);
    });

    test("getSampleConnectionString contains sfdc prefix", () => {
      const sample = scripts.getSampleConnectionString("sfdc");
      expect(sample).toContain("sfdc://");
      expect(sample).toContain("username");
      expect(sample).toContain("password");
    });

    test("getSampleSelectQuery returns a select query", () => {
      const result = scripts.getSampleSelectQuery(tableInput);
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("FROM Account");
    });
  });
});
