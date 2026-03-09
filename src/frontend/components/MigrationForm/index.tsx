import MigrationBox from "src/frontend/components/MigrationBox";

/**
 * Migration form for migrating data from a real database connection.
 * @returns A MigrationBox configured in "real_connection" mode.
 */
export function RealConnectionMigrationMigrationForm() {
  return <MigrationBox mode="real_connection" />;
}

/**
 * Migration form for migrating data from raw JSON input.
 * @returns A MigrationBox configured in "raw_json" mode.
 */
export function RawJsonMigrationForm() {
  return <MigrationBox mode="raw_json" />;
}
