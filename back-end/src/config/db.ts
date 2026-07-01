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
  uporabnisko_ime: string;
  user_password: string;
  datum_zadnje_posodobitve: string | null;
  e_posta: string;
}

export const findUserByUsername = async (
  username: string
): Promise<UporabnikRow[]> => {
  const [rows] = await pool.query<UporabnikRow[]>(
    `
    SELECT
      uporabnik_id,
      uporabnisko_ime,
      user_password,
      datum_zadnje_posodobitve,
      e_posta
    FROM uporabnik
    WHERE uporabnisko_ime = ?
    `,
    [username]
  );

  return rows;
};

export const findUserByEmail = async (
  email: string
): Promise<UporabnikRow[]> => {
  const [rows] = await pool.query<UporabnikRow[]>(
    `
    SELECT
      uporabnik_id,
      uporabnisko_ime,
      user_password,
      datum_zadnje_posodobitve,
      e_posta
    FROM uporabnik
    WHERE e_posta = ?
    `,
    [email]
  );

  return rows;
};

export const createUporabnik = async (
  username: string,
  email: string,
  password: string
): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO uporabnik (
      uporabnisko_ime,
      user_password,
      datum_zadnje_posodobitve,
      e_posta
    )
    VALUES (?, ?, CURDATE(), ?)
    `,
    [username, password, email]
  );

  return result;
};

export default pool;