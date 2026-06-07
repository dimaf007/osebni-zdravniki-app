import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DBHOST,
  port: Number(process.env.DBPORT || 3306),
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  database: process.env.DBDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;