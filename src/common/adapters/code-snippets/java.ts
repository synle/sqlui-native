export const relational = `\
import java.sql.*;

public class Main {

    private static final String DB_URL =
            "{{{jdbcUrl}}}";

    public static void main(String[] args) {
        try (Connection conn = DriverManager.getConnection(DB_URL)) {

            if (conn != null) {
                System.out.println("Connected to: " + DB_URL);
                runQuery(conn);
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private static void runQuery(Connection conn) throws SQLException {
        String sql = """
{{{escapedSql}}}
        """;

        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            ResultSetMetaData meta = rs.getMetaData();
            int columnCount = meta.getColumnCount();

            // Print column headers
            for (int i = 1; i <= columnCount; i++) {
                System.out.print(meta.getColumnName(i) + "\\t");
            }
            System.out.println();

            // Print rows
            while (rs.next()) {
                for (int i = 1; i <= columnCount; i++) {
                    System.out.print(rs.getString(i) + "\\t");
                }
                System.out.println();
            }
        }
    }
}`;

export const cassandra = `\
import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import java.net.InetSocketAddress;

public class Main {
    public static void main(String[] args) {
        try (CqlSession session = CqlSession.builder()
                .addContactPoint(new InetSocketAddress("{{{host}}}", {{{port}}}))
                {{{authCredentialsLine}}}
                .withLocalDatacenter("datacenter1")
                .withKeyspace("{{{keyspace}}}")
                .build()) {

            ResultSet rs = session.execute("{{{escapedSql}}}");
            for (Row row : rs) {
                System.out.println(row.getFormattedContents());
            }
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`;

export const mongodb = `\
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;

public class Main {
    public static void main(String[] args) {
        try (MongoClient client = MongoClients.create("{{{connectionString}}}")) {
            MongoDatabase db = client.getDatabase("{{{database}}}");

            // Adjust the query below to use the Java MongoDB driver syntax
            // Example: find all documents in a collection
            MongoCollection<Document> collection = db.getCollection("your_collection");
            for (Document doc : collection.find()) {
                System.out.println(doc.toJson());
            }
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`;

export const redis = `\
import redis.clients.jedis.Jedis;

public class Main {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("{{{url}}}")) {
            {{{authLine}}}

            // Example: get a key
            String res = jedis.get("key");
            System.out.println(res);
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`;

export const cosmosdb = `\
import com.azure.cosmos.CosmosClient;
import com.azure.cosmos.CosmosClientBuilder;
import com.azure.cosmos.CosmosContainer;
import com.azure.cosmos.CosmosDatabase;
import com.azure.cosmos.models.CosmosQueryRequestOptions;
import com.azure.cosmos.util.CosmosPagedIterable;
import com.fasterxml.jackson.databind.JsonNode;

public class Main {
    public static void main(String[] args) {
        // Parse connection string for endpoint and key
        String connectionString = "{{{connectionString}}}";
        String endpoint = "";
        String key = "";
        for (String part : connectionString.split(";")) {
            if (part.startsWith("AccountEndpoint=")) endpoint = part.substring("AccountEndpoint=".length());
            if (part.startsWith("AccountKey=")) key = part.substring("AccountKey=".length());
        }

        try (CosmosClient client = new CosmosClientBuilder()
                .endpoint(endpoint)
                .key(key)
                .buildClient()) {

            CosmosDatabase database = client.getDatabase("{{{databaseId}}}");
            CosmosContainer container = database.getContainer("{{{tableId}}}");

            CosmosPagedIterable<JsonNode> items = container.queryItems(
                "SELECT * FROM c", new CosmosQueryRequestOptions(), JsonNode.class);
            for (JsonNode item : items) {
                System.out.println(item);
            }
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`;

export const aztable = `\
import com.azure.data.tables.TableClient;
import com.azure.data.tables.TableClientBuilder;
import com.azure.data.tables.TableServiceClient;
import com.azure.data.tables.TableServiceClientBuilder;
import com.azure.data.tables.models.TableEntity;
import com.azure.data.tables.models.ListEntitiesOptions;

public class Main {
    public static void main(String[] args) {
        String connectionString = "{{{connectionString}}}";
        String table = "{{{tableId}}}";

        try {
            TableServiceClient serviceClient = new TableServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();

            TableClient tableClient = new TableClientBuilder()
                .connectionString(connectionString)
                .tableName(table)
                .buildClient();

            // List entities
            for (TableEntity entity : tableClient.listEntities()) {
                System.out.println("PartitionKey: " + entity.getPartitionKey()
                    + ", RowKey: " + entity.getRowKey()
                    + ", Properties: " + entity.getProperties());
            }
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`;
