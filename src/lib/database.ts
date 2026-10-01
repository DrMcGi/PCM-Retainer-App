import postgres from "postgres";

type RetainerDatabase = ReturnType<typeof postgres>;

const globalForDatabase = globalThis as typeof globalThis & {
  retainerDatabase?: RetainerDatabase;
};

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("The retainer database has not been configured.");
  }

  if (!globalForDatabase.retainerDatabase) {
    globalForDatabase.retainerDatabase = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return globalForDatabase.retainerDatabase;
}