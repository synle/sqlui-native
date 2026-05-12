import { vi, describe, test, expect, beforeEach } from "vitest";

vi.mock("jsforce/lib/connection", () => {
  const inst: any = {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    identity: vi.fn(),
    describeGlobal: vi.fn(),
    sobject: vi.fn(),
    query: vi.fn(),
    search: vi.fn(),
    _establish: vi.fn(),
  };
  const ctor = vi.fn().mockImplementation(() => inst);
  (globalThis as any).__sfdcConnInstance = inst;
  (globalThis as any).__sfdcConnCtor = ctor;
  return { Connection: ctor };
});

vi.mock("node:https", () => {
  const req = vi.fn();
  (globalThis as any).__sfdcHttpsRequest = req;
  return {
    default: { request: (...args: any[]) => req(...args) },
    request: (...args: any[]) => req(...args),
  };
});

import SalesforceDataAdapter from "src/common/adapters/SalesforceDataAdapter/index";

const connInstance: any = (globalThis as any).__sfdcConnInstance;
const ConnectionCtor: any = (globalThis as any).__sfdcConnCtor;
const mockHttpsRequest: any = (globalThis as any).__sfdcHttpsRequest;

const validConnString = `sfdc://${JSON.stringify({
  username: "user@example.com",
  password: "pw",
  securityToken: "tok",
  loginUrl: "login.salesforce.com",
})}`;

describe("SalesforceDataAdapter", () => {
  beforeEach(() => {
    // Reset only call history; preserve implementations (vi.clearAllMocks would nuke ctor impl).
    ConnectionCtor.mockClear();
    ConnectionCtor.mockImplementation(function () {
      return connInstance;
    });
    Object.values(connInstance).forEach((fn: any) => fn?.mockReset?.());
    connInstance.login.mockResolvedValue(undefined);
    connInstance.logout.mockResolvedValue(undefined);
    mockHttpsRequest.mockReset();
  });

  describe("constructor + parsing", () => {
    test("throws on invalid connection string", async () => {
      const a = new SalesforceDataAdapter("sfdc://not-json{");
      await expect(a.authenticate()).rejects.toThrow(/Invalid SFDC connection string/);
    });

    test("loginUrl normalization — strips trailing slashes and adds https://", async () => {
      const a = new SalesforceDataAdapter(
        `sfdc://${JSON.stringify({ username: "u", password: "p", loginUrl: "my-org.my.salesforce.com//" })}`,
      );
      await a.authenticate();
      expect(ConnectionCtor).toHaveBeenCalledWith(expect.objectContaining({ loginUrl: "https://my-org.my.salesforce.com" }));
    });

    test("default loginUrl is https://login.salesforce.com", async () => {
      const a = new SalesforceDataAdapter(`sfdc://${JSON.stringify({ username: "u", password: "p" })}`);
      await a.authenticate();
      expect(ConnectionCtor).toHaveBeenCalledWith(expect.objectContaining({ loginUrl: "https://login.salesforce.com" }));
    });
  });

  describe("authenticate", () => {
    test("password login — calls Connection.login with password+token", async () => {
      const a = new SalesforceDataAdapter(validConnString);
      await a.authenticate();
      expect(connInstance.login).toHaveBeenCalledWith("user@example.com", "pwtok");
    });

    test("error path — rewrites SOAP API disabled", async () => {
      connInstance.login.mockRejectedValueOnce(new Error("SOAP API login() is disabled"));
      const a = new SalesforceDataAdapter(validConnString);
      await expect(a.authenticate()).rejects.toThrow(/SOAP API login is disabled/);
    });

    test("error path — rewrites INVALID_LOGIN", async () => {
      connInstance.login.mockRejectedValueOnce(new Error("INVALID_LOGIN: bad creds"));
      const a = new SalesforceDataAdapter(validConnString);
      await expect(a.authenticate()).rejects.toThrow(/Invalid login credentials/);
    });

    test("error path — rewrites LOGIN_MUST_USE_SECURITY_TOKEN", async () => {
      connInstance.login.mockRejectedValueOnce(new Error("LOGIN_MUST_USE_SECURITY_TOKEN: oh no"));
      const a = new SalesforceDataAdapter(validConnString);
      await expect(a.authenticate()).rejects.toThrow(/Security token required/);
    });

    test("error path — unrecognized error passed through", async () => {
      connInstance.login.mockRejectedValueOnce(new Error("something else"));
      const a = new SalesforceDataAdapter(validConnString);
      await expect(a.authenticate()).rejects.toThrow(/something else/);
    });

    test("client credentials flow — uses native https.request, _establish on success", async () => {
      const a = new SalesforceDataAdapter(
        `sfdc://${JSON.stringify({ clientId: "cid", clientSecret: "csec", loginUrl: "https://my.salesforce.com" })}`,
      );
      mockHttpsRequest.mockImplementation((_opts: any, cb: any) => {
        const res: any = { on: vi.fn() };
        let dataCb: any, endCb: any;
        res.on.mockImplementation((evt: string, fn: any) => {
          if (evt === "data") dataCb = fn;
          if (evt === "end") endCb = fn;
        });
        // immediately invoke once res handler set up
        setImmediate(() => {
          cb(res);
          dataCb(JSON.stringify({ access_token: "tok123", instance_url: "https://my.salesforce.com" }));
          endCb();
        });
        return { on: vi.fn(), write: vi.fn(), end: vi.fn() };
      });
      await a.authenticate();
      expect(connInstance._establish).toHaveBeenCalledWith({
        instanceUrl: "https://my.salesforce.com",
        accessToken: "tok123",
      });
    });

    test("client credentials flow — error response rejects", async () => {
      const a = new SalesforceDataAdapter(
        `sfdc://${JSON.stringify({ clientId: "cid", clientSecret: "csec", loginUrl: "https://my.salesforce.com" })}`,
      );
      mockHttpsRequest.mockImplementation((_opts: any, cb: any) => {
        const res: any = { on: vi.fn() };
        let dataCb: any, endCb: any;
        res.on.mockImplementation((evt: string, fn: any) => {
          if (evt === "data") dataCb = fn;
          if (evt === "end") endCb = fn;
        });
        setImmediate(() => {
          cb(res);
          dataCb(JSON.stringify({ error: "invalid_client", error_description: "bad client" }));
          endCb();
        });
        return { on: vi.fn(), write: vi.fn(), end: vi.fn() };
      });
      await expect(a.authenticate()).rejects.toThrow(/bad client/);
    });
  });

  describe("metadata methods", () => {
    test("getDatabases — returns org as single database", async () => {
      connInstance.identity.mockResolvedValueOnce({ organization_id: "00D000000000ABC" });
      const a = new SalesforceDataAdapter(validConnString);
      const dbs = await a.getDatabases();
      expect(dbs).toEqual([{ name: "00D000000000ABC", tables: [] }]);
    });

    test("getDatabases — fallback name when missing org id", async () => {
      connInstance.identity.mockResolvedValueOnce({});
      const a = new SalesforceDataAdapter(validConnString);
      const dbs = await a.getDatabases();
      expect(dbs[0].name).toBe("Salesforce Org");
    });

    test("getTables — filters non-queryable", async () => {
      connInstance.describeGlobal.mockResolvedValueOnce({
        sobjects: [
          { name: "Account", queryable: true },
          { name: "SecretMeta", queryable: false },
          { name: "Contact", queryable: true },
        ],
      });
      const a = new SalesforceDataAdapter(validConnString);
      const tables = await a.getTables();
      expect(tables.map((t) => t.name)).toEqual(["Account", "Contact"]);
    });

    test("getColumns — maps describe.fields", async () => {
      connInstance.sobject.mockReturnValueOnce({
        describe: vi.fn().mockResolvedValueOnce({
          fields: [
            { name: "Id", type: "id", nillable: false, label: "ID" },
            { name: "Name", type: "string", nillable: true, label: "Name" },
          ],
        }),
      });
      const a = new SalesforceDataAdapter(validConnString);
      const cols = await a.getColumns("Account");
      expect(cols[0]).toMatchObject({ name: "Id", primaryKey: true, allowNull: false, comment: "ID" });
      expect(cols[1]).toMatchObject({ name: "Name", primaryKey: false, allowNull: true });
    });
  });

  describe("execute", () => {
    test("SOQL SELECT — strips attributes", async () => {
      connInstance.query.mockResolvedValueOnce({
        totalSize: 1,
        done: true,
        records: [{ attributes: { type: "Account" }, Id: "001", Name: "Acme", Owner: { attributes: { type: "User" }, Id: "U1" } }],
      });
      const a = new SalesforceDataAdapter(validConnString);
      const r = await a.execute("SELECT Id, Name FROM Account");
      expect(r.ok).toBe(true);
      expect(r.raw?.[0].attributes).toBeUndefined();
      expect(r.raw?.[0].Owner.attributes).toBeUndefined();
      expect(r.meta).toMatchObject({ totalSize: 1, done: true });
    });

    test("SOSL FIND — searchRecords path", async () => {
      connInstance.search.mockResolvedValueOnce({
        searchRecords: [{ attributes: { type: "Account" }, Id: "001" }],
      });
      const a = new SalesforceDataAdapter(validConnString);
      const r = await a.execute("FIND {acme} IN ALL FIELDS");
      expect(r.ok).toBe(true);
      expect(r.raw?.[0].attributes).toBeUndefined();
    });

    test("execute returns ok:false with rewritten message on error", async () => {
      connInstance.query.mockRejectedValueOnce(new Error("INVALID_LOGIN"));
      const a = new SalesforceDataAdapter(validConnString);
      const r = await a.execute("SELECT Id FROM Account");
      expect(r.ok).toBe(false);
      expect(r.error).toBeDefined();
    });

    test("SOQL no records — returns ok with meta only", async () => {
      connInstance.query.mockResolvedValueOnce({ rowCount: 0 });
      const a = new SalesforceDataAdapter(validConnString);
      const r = await a.execute("SELECT Id FROM Account WHERE 1=0");
      expect(r.ok).toBe(true);
      expect(r.raw).toBeUndefined();
    });
  });

  describe("disconnect", () => {
    test("calls logout on the cached connection", async () => {
      const a = new SalesforceDataAdapter(validConnString);
      await a.authenticate();
      await a.disconnect();
      expect(connInstance.logout).toHaveBeenCalled();
    });

    test("swallows logout error", async () => {
      connInstance.logout.mockRejectedValueOnce(new Error("offline"));
      const a = new SalesforceDataAdapter(validConnString);
      await a.authenticate();
      await expect(a.disconnect()).resolves.toBeUndefined();
    });

    test("no-op when never authenticated", async () => {
      const a = new SalesforceDataAdapter(validConnString);
      await expect(a.disconnect()).resolves.toBeUndefined();
    });
  });
});
