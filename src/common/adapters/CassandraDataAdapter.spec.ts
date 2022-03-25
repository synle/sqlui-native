import CassandraDataAdapter from 'src/common/adapters/CassandraDataAdapter';

describe(' 2 cassandra v4', () => {
  let adapter

  beforeAll(() => {
    adapter = new CassandraDataAdapter('cassandra://localhost:9042');
  });

  test('Get database', async () => {
    const databases = await adapter.getDatabases();
    expect(databases).toMatchInlineSnapshot(`
Array [
  Object {
    "name": "music_stores",
    "tables": Array [],
  },
  Object {
    "name": "system",
    "tables": Array [],
  },
  Object {
    "name": "system_auth",
    "tables": Array [],
  },
  Object {
    "name": "system_distributed",
    "tables": Array [],
  },
  Object {
    "name": "system_schema",
    "tables": Array [],
  },
  Object {
    "name": "system_traces",
    "tables": Array [],
  },
  Object {
    "name": "system_views",
    "tables": Array [],
  },
  Object {
    "name": "system_virtual_schema",
    "tables": Array [],
  },
]
`);
  });

  test('Get tables', async () => {
    const tables = await adapter.getTables('system');
    expect(tables).toMatchInlineSnapshot(`
Array [
  Object {
    "columns": Array [],
    "name": "available_ranges",
  },
  Object {
    "columns": Array [],
    "name": "available_ranges_v2",
  },
  Object {
    "columns": Array [],
    "name": "batches",
  },
  Object {
    "columns": Array [],
    "name": "built_views",
  },
  Object {
    "columns": Array [],
    "name": "compaction_history",
  },
  Object {
    "columns": Array [],
    "name": "IndexInfo",
  },
  Object {
    "columns": Array [],
    "name": "local",
  },
  Object {
    "columns": Array [],
    "name": "paxos",
  },
  Object {
    "columns": Array [],
    "name": "peer_events",
  },
  Object {
    "columns": Array [],
    "name": "peer_events_v2",
  },
  Object {
    "columns": Array [],
    "name": "peers",
  },
  Object {
    "columns": Array [],
    "name": "peers_v2",
  },
  Object {
    "columns": Array [],
    "name": "prepared_statements",
  },
  Object {
    "columns": Array [],
    "name": "repairs",
  },
  Object {
    "columns": Array [],
    "name": "size_estimates",
  },
  Object {
    "columns": Array [],
    "name": "sstable_activity",
  },
  Object {
    "columns": Array [],
    "name": "table_estimates",
  },
  Object {
    "columns": Array [],
    "name": "transferred_ranges",
  },
  Object {
    "columns": Array [],
    "name": "transferred_ranges_v2",
  },
  Object {
    "columns": Array [],
    "name": "view_builds_in_progress",
  },
]
`);
  });

  test('Get columns', async () => {
    const columns = await adapter.getColumns('columns', 'system_schema');
    expect(columns).toMatchInlineSnapshot(`
Array [
  Object {
    "kind": "regular",
    "name": "clustering_order",
    "type": "text",
  },
  Object {
    "kind": "clustering",
    "name": "column_name",
    "type": "text",
  },
  Object {
    "kind": "regular",
    "name": "column_name_bytes",
    "type": "blob",
  },
  Object {
    "kind": "partition_key",
    "name": "keyspace_name",
    "type": "text",
  },
  Object {
    "kind": "regular",
    "name": "kind",
    "type": "text",
  },
  Object {
    "kind": "regular",
    "name": "position",
    "type": "int",
  },
  Object {
    "kind": "clustering",
    "name": "table_name",
    "type": "text",
  },
  Object {
    "kind": "regular",
    "name": "type",
    "type": "text",
  },
]
`);
  });

  test('Execute Select', async () => {
    const resp = await adapter.execute(`SELECT * FROM tables LIMIT 10`, 'system_schema');
    //@ts-ignore
    expect(resp.raw.length > 0).toBeTruthy();
  });
});
