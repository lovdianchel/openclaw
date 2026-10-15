import type { DatabaseSync } from "node:sqlite";
import { redactSensitiveText } from "../../logging/redact.js";
import { getNodeSqliteKysely } from "../kysely-sync.js";
import { PostgresSyncConnection } from "../postgres-sync/connection.js";
import { isPostgresSqlConnection, type PostgresSqlConnection } from "../sql-connection.js";
import {
  runSqliteDeferredTransactionSync,
  runSqliteImmediateTransactionSync,
  runSqliteReadSnapshotSync,
} from "../sqlite-transaction.js";
import type { DatabaseEngineAdapter, DatabaseErrorKind } from "./contract.js";
import { observeConnection } from "./observation.js";
import { POSTGRES_LOCK_TIMEOUT_MS, POSTGRES_STATEMENT_TIMEOUT_MS } from "./policy.js";
import {
  postgresSchemaSql,
  verifyAndRecordPostgresSchema,
  readPostgresSchema,
  verifyPostgresSchema,
} from "./postgres-schema.js";
import { bindStoreSearch, type SearchSchema, type SearchStore } from "./search.js";
