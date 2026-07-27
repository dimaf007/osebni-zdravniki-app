// Konfiguracija povezave z bazo podatkov in pomožne funkcije za delo z uporabniki.
// Datoteka inicializira MySQL connection pool,
// definira TypeScript tip za vrstico iz tabele uporabnik
// ter vsebuje funkcije za iskanje, ustvarjanje in brisanje uporabnika.
// Poleg samega uporabnika pri brisanju odstranimo tudi vse povezane poizvedbe
// in njihove povezave na kraje, da ohranimo konsistentnost podatkov v bazi.

import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Ustvarimo pool povezav do baze.
// Pool omogoča učinkovitejšo ponovno uporabo povezav
// in je primeren za Express aplikacijo z več zahtevki.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tip ene vrstice iz tabele uporabnik.
// Razširimo RowDataPacket, da dobimo pravilno tipizacijo
// pri SELECT poizvedbah preko mysql2/promise.
export interface UporabnikRow extends RowDataPacket {
  uporabnik_id: number;
  uporabnisko_ime: string;
  user_password: string;
  datum_zadnje_posodobitve: string | null;
  e_posta: string;
}

// Poišče uporabnika po uporabniškem imenu.
// Funkcija vrne seznam zadetkov, čeprav v praksi pričakujemo največ enega,
// ker naj bi bilo uporabniško ime unikatno.
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

// Poišče uporabnika po e-poštnem naslovu.
// Uporablja se predvsem pri registraciji za preverjanje,
// ali je e-poštni naslov že zaseden.
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

// Ustvari novega uporabnika v tabeli uporabnik.
// Datum zadnje posodobitve nastavimo na trenutni datum z uporabo CURDATE().
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

// Izbriše uporabniški račun glede na ID uporabnika.
// Pred brisanjem samega uporabnika odstranimo še vse povezane podatke:
// 1. povezave med poizvedbami in kraji iz tabele poizvedba_kraj,
// 2. uporabnikove poizvedbe iz tabele iskalna_poizvedba,
// 3. uporabnika iz tabele uporabnik.
// Vse operacije izvedemo v transakciji, da ob morebitni napaki
// ne ostanemo v delno izbrisanem stanju.
export const deleteUserAccountByUserId = async (
  userId: number
): Promise<boolean> => {
  const connection = await pool.getConnection();

  try {
    // Začnemo transakcijo, ker brišemo podatke iz več tabel.
    await connection.beginTransaction();

    // Najprej izbrišemo vse zapise iz povezovalne tabele poizvedba_kraj,
    // ki pripadajo poizvedbam izbranega uporabnika.
    await connection.query<ResultSetHeader>(
      `
      DELETE pk
      FROM poizvedba_kraj pk
      INNER JOIN iskalna_poizvedba ip
        ON pk.poizvedba_id = ip.poizvedba_id
      WHERE ip.uporabnik_id = ?
      `,
      [userId]
    );

    // Nato izbrišemo vse uporabnikove poizvedbe oziroma naročnine.
    await connection.query<ResultSetHeader>(
      `
      DELETE FROM iskalna_poizvedba
      WHERE uporabnik_id = ?
      `,
      [userId]
    );

    // Na koncu izbrišemo še uporabnika samega.
    const [deleteUserResult] = await connection.query<ResultSetHeader>(
      `
      DELETE FROM uporabnik
      WHERE uporabnik_id = ?
      `,
      [userId]
    );

    // Če so vsi koraki uspešni, potrdimo transakcijo.
    await connection.commit();

    // Funkcija vrne true samo, če je bil dejansko izbrisan točno en uporabnik.
    return deleteUserResult.affectedRows === 1;
  } catch (error) {
    // Ob napaki razveljavimo vse spremembe iz te transakcije.
    await connection.rollback();
    throw error;
  } finally {
    // Povezavo vedno vrnemo nazaj v pool.
    connection.release();
  }
};

// Ustvari zapis v tabeli password_reset za danega uporabnika.
// Funkcija se uporablja ob zahtevi za ponastavitev gesla.
export const createPasswordResetCode = async (
  userId: number,
  resetCode: string
): Promise<ResultSetHeader> => {
  const [result] = await pool.query<ResultSetHeader>(
    `
    INSERT INTO password_reset (
      user_id,
      reset_code,
      created_at,
      used_at
    )
    VALUES (?, ?, NOW(), NULL)
    `,
    [userId, resetCode]
  )

  return result
}

// Poišče uporabnika na podlagi še neuporabljenega reset koda.
// Funkcija vrne vsaj osnovne podatke o uporabniku,
// če reset koda obstaja in še ni bila uporabljena.
export const findUserByResetCode = async (
  resetCode: string
): Promise<UporabnikRow[]> => {
  const [rows] = await pool.query<UporabnikRow[]>(
    `
    SELECT
      u.uporabnik_id,
      u.uporabnisko_ime,
      u.user_password,
      u.datum_zadnje_posodobitve,
      u.e_posta
    FROM uporabnik u
    INNER JOIN password_reset pr
      ON pr.user_id = u.uporabnik_id
    WHERE pr.reset_code = ?
      AND pr.used_at IS NULL
    `,
    [resetCode]
  )

  return rows
}

// Posodobi geslo uporabnika in označi podani reset zapis kot uporabljen.
// Funkcija se kliče ob uspešni ponastavitvi gesla.
export const updateUserPasswordWithResetCode = async (
  userId: number,
  newPassword: string,
  resetCode: string
): Promise<boolean> => {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // Najprej posodobimo geslo uporabnika.
    const [updateUserResult] = await connection.query<ResultSetHeader>(
      `
      UPDATE uporabnik
      SET user_password = ?, datum_zadnje_posodobitve = CURDATE()
      WHERE uporabnik_id = ?
      `,
      [newPassword, userId]
    )

    // Nato označimo reset kodo kot uporabljeno.
    const [updateResetResult] = await connection.query<ResultSetHeader>(
      `
      UPDATE password_reset
      SET used_at = NOW()
      WHERE user_id = ?
        AND reset_code = ?
        AND used_at IS NULL
      `,
      [userId, resetCode]
    )

    await connection.commit()

    // Vrne true le, če smo posodobili tako uporabnika kot reset zapis.
    return (
      updateUserResult.affectedRows === 1 &&
      updateResetResult.affectedRows === 1
    )
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Privzeti export pool-a uporabljajo tudi drugi moduli aplikacije.
export default pool;