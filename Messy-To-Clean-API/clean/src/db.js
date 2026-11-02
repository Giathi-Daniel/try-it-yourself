import mysql from 'mysql2/promise';
import { config } from './config.js';

// A pool reuses connections instead of opening one per request.
export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
});
