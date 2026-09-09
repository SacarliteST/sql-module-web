import type {
  StudentSchemaColumnPairResponse,
  StudentSchemaForeignKeyResponse,
  StudentTaskSchemaResponse,
} from '../../../api/sqlmodule/model';

export type StudentDatabaseSchema = StudentTaskSchemaResponse;

export function schemaColumnPairs(foreignKey: StudentSchemaForeignKeyResponse): StudentSchemaColumnPairResponse[] {
  return foreignKey.columnPairs ?? [];
}
