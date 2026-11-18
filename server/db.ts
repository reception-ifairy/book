import type { Pool } from 'mysql2/promise';

/**
 * One lazy connection pool to the t1000 MariaDB database (T1000_DATABASE_URL, account ignis_book),
 * shared by admin login and the character registry. The driver loads only when something asks for it,
 * so tests and setups without a database never touch it.
 */
let pool: Pool | null = null;

export const t1000Configured = () => !!process.env.T1000_DATABASE_URL;

export async function t1000Pool(): Promise<Pool> {
  if (!process.env.T1000_DATABASE_URL) throw new Error('T1000_DATABASE_URL is not set.');
  if (!pool) {
    const mysql = await import('mysql2/promise');
    pool = mysql.createPool({ uri: process.env.T1000_DATABASE_URL, connectionLimit: 3, waitForConnections: true });
  }
  return pool;
}
