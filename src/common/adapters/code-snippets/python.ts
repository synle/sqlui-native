export const relational = `\
# python3 -m venv ./ # setting up virtual environment with
# source bin/activate # activate the venv profile
# pip install sqlalchemy
{{{deps}}}
from sqlalchemy import create_engine, text

engine = create_engine('{{{connectionString}}}', echo = True)

with engine.connect() as con:
  rs = con.execute(text("""{{{sql}}}"""))

  for row in rs:
    print(row)`;

export const cassandra = `\
# python3 -m venv ./ # setting up virtual environment with
# source bin/activate # activate the venv profile
# pip install cassandra-driver
from cassandra.cluster import Cluster
from ssl import PROTOCOL_TLSv1_2, SSLContext, CERT_NONE
from cassandra.auth import PlainTextAuthProvider

# remove \`ssl_context=ssl_context\` to disable SSL (applicable for Cassandra in CosmosDB)
ssl_context = SSLContext(PROTOCOL_TLSv1_2)
ssl_context.verify_mode = CERT_NONE
cluster = Cluster(['{{{host}}}'], port={{{port}}}, auth_provider=PlainTextAuthProvider(username='{{{username}}}', password='{{{password}}}'), ssl_context=ssl_context)
session = cluster.connect()

session.execute('USE {{{keyspace}}}')
rows = session.execute("""{{{sql}}}""")
for row in rows:
    print(row)`;

export const mongodb = `\
# python3 -m venv ./ # setting up virtual environment
# source bin/activate # activate the venv profile
# pip install pymongo
from pymongo import MongoClient
from bson.objectid import ObjectId

def _do_work():
    try:
        database = '{{{database}}}'

        client = MongoClient('{{{connectionString}}}')
        db = client[database]

        # Note: adjust the query below to use PyMongo syntax
        # For example: db['collection_name'].find().limit(10)
        res = list({{{pythonSql}}})

        for item in res if isinstance(res, list) else [res]:
            print(item)
    except Exception as err:
        print('Failed to connect', err)

_do_work()`;

export const redis = `\
# python3 -m venv ./ # setting up virtual environment
# source bin/activate # activate the venv profile
# pip install redis
import redis

def _do_work():
    try:
        client = redis.Redis.from_url('{{{url}}}'{{{passwordArg}}})
        res = client.{{{pythonCommand}}}
        print(res)
    except Exception as err:
        print('Failed to connect', err)

_do_work()`;

export const cosmosdb = `\
# python3 -m venv ./ # setting up virtual environment
# source bin/activate # activate the venv profile
# pip install azure-cosmos
from azure.cosmos import CosmosClient

def _do_work():
    try:
        client = CosmosClient.from_connection_string('{{{connectionString}}}')

        # List databases
        # for db in client.list_databases():
        #     print(db['id'])

        database = client.get_database_client('{{{databaseId}}}')
        container = database.get_container_client('{{{tableId}}}')

        # Query items
        items = list(container.query_items(
            query='SELECT * FROM c',
            enable_cross_partition_query=True
        ))
        for item in items:
            print(item)
    except Exception as err:
        print('Failed to connect', err)

_do_work()`;

export const aztable = `\
# python3 -m venv ./ # setting up virtual environment
# source bin/activate # activate the venv profile
# pip install azure-data-tables
from azure.data.tables import TableServiceClient, TableClient

def _do_work():
    try:
        connection_string = '{{{connectionString}}}'
        table = '{{{tableId}}}'

        service_client = TableServiceClient.from_connection_string(connection_string)
        table_client = TableClient.from_connection_string(connection_string, table) if table else None

        # List tables
        # for table in service_client.list_tables():
        #     print(table.name)

        # Query entities
        if table_client:
            entities = table_client.list_entities()
            for entity in entities:
                print(entity)
    except Exception as err:
        print('Failed to connect', err)

_do_work()`;
