import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export interface UporabnikRow extends RowDataPacket {
  uporabnik_id: number;
  zunanji_id: string | null;
  uporabnisko_ime: string;
  user_password: string;
  ime: string;
  priimek: string;
  datum_zadnje_posodobitve: string | null;
}

export const findUserByUsername = async (
  username: string
): Promise<UporabnikRow[]> => {
  const [rows] = await pool.query<UporabnikRow[]>(
    `
    SELECT
      uporabnik_id,
      zunanji_id,
      uporabnisko_ime,
      user_password,
      ime,
      priimek,
      datum_zadnje_posodobitve
    FROM uporabnik
    WHERE uporabnisko_ime = ?
    `,
    [username]
  );

  return rows;
};

export const createUporabnik = async (
  username: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO uporabnik (
      zunanji_id,
      uporabnisko_ime,
      user_password,
      ime,
      priimek,
      datum_zadnje_posodobitve
    )
    VALUES (?, ?, ?, ?, ?, CURDATE())
    `,
    [null, username, password, firstName, lastName]
  );

  return result;
};

export default pool;