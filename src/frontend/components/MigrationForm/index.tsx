import MigrationBox from 'src/frontend/components/MigrationBox';

export function RealConnectionMigrationMigrationForm() {
  return <MigrationBox mode='real_connection' />;
}

export function RawJsonMigrationForm() {
  return <MigrationBox mode='raw_json' />;
}