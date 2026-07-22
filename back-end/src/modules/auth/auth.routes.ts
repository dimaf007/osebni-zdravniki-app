// Modul za avtentikacijo uporabnikov.
// Datoteka definira API poti za registracijo, prijavo
// in brisanje uporabniškega računa.
// Tukaj izvajamo osnovno validacijo vhodnih podatkov,
// preverjamo obstoj uporabnika v bazi
// ter vračamo ustrezne HTTP odgovore glede na rezultat operacije.

import { Request, Response, NextFunction, Router } from "express";
import {
  createUporabnik,
  deleteUserAccountByUserId,
  findUserByEmail,
  findUserByUsername,
} from "../../config/db.js";

const router = Router();

// Kontroler za registracijo novega uporabnika.
// Preveri obvezna polja, unikatnost uporabniškega imena in e-pošte,
// nato pa ustvari novega uporabnika v bazi.
const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    // Počistimo vhodne vrednosti, da se izognemo težavam
    // z odvečnimi presledki in različnimi oblikami e-poštnega naslova.
    username = username?.trim();
    email = email?.trim().toLowerCase();
    password = password?.trim();

    // Vsa tri polja so obvezna za registracijo.
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Username, email and password are required.",
      });
      return;
    }

    // Preverimo, ali uporabniško ime že obstaja.
    const existingUsers = await findUserByUsername(username);

    if (existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        message: "Username is already taken.",
      });
      return;
    }

    // Preverimo, ali je e-poštni naslov že registriran.
    const existingEmails = await findUserByEmail(email);

    if (existingEmails.length > 0) {
      res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
      return;
    }

    // Če sta uporabniško ime in e-pošta prosta,
    // ustvarimo novega uporabnika v podatkovni bazi.
    const queryResult = await createUporabnik(username, email, password);

    if (queryResult.affectedRows === 1) {
      res.status(201).json({
        success: true,
        message: "User registered.",
        user: {
          id: queryResult.insertId,
          username,
          email,
        },
      });
      return;
    }

    // Ta veja se izvede le, če INSERT ni vrnil pričakovanega rezultata.
    res.status(500).json({
      success: false,
      message: "User was not registered.",
    });
  } catch (error) {
    next(error);
  }
};

// Kontroler za prijavo uporabnika.
// Na podlagi uporabniškega imena poišče uporabnika v bazi
// in preveri, ali se geslo ujema z zapisanim geslom.
const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    // Počistimo vhodne podatke.
    username = username?.trim();
    password = password?.trim();

    // Za prijavo sta obvezna uporabniško ime in geslo.
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
      return;
    }

    // Poiščemo uporabnika po uporabniškem imenu.
    const users = await findUserByUsername(username);

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: "User is not registered.",
      });
      return;
    }

    const user = users[0];

    // Preverimo, ali se vneseno geslo ujema z geslom v bazi.
    if (password !== user.user_password) {
      res.status(401).json({
        success: false,
        message: "Incorrect password.",
      });
      return;
    }

    // Če je prijava uspešna, vrnemo osnovne podatke o uporabniku.
    // Front-end jih lahko shrani v svoj auth state.
    res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.uporabnik_id,
        username: user.uporabnisko_ime,
        email: user.e_posta,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Kontroler za brisanje uporabniškega računa.
// Uporabnik mora za varnost ponovno poslati svoje uporabniško ime in geslo.
// Po uspešni potrditvi izbrišemo tudi vse povezane naročnine oziroma poizvedbe.
const deleteAccountController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    // Počistimo vhodne podatke.
    username = username?.trim();
    password = password?.trim();

    // Za brisanje računa sta obvezna uporabniško ime in geslo.
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
      return;
    }

    // Poiščemo uporabnika, ki želi izbrisati svoj račun.
    const users = await findUserByUsername(username);

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: "User was not found.",
      });
      return;
    }

    const user = users[0];

    // Pred brisanjem računa ponovno preverimo geslo.
    if (password !== user.user_password) {
      res.status(401).json({
        success: false,
        message: "Incorrect password.",
      });
      return;
    }

    // Če je preverjanje uspešno, izbrišemo uporabnika
    // in vse njegove povezane podatke iz baze.
    const deleted = await deleteUserAccountByUserId(user.uporabnik_id);

    if (!deleted) {
      res.status(500).json({
        success: false,
        message: "User account was not deleted.",
      });
      return;
    }

    // Ob uspešnem brisanju vrnemo potrditveno sporočilo.
    res.status(200).json({
      success: true,
      message: "User account and related subscriptions were deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Definicija API poti modula auth.
router.post("/register", registerController);
router.post("/login", loginController);
router.delete("/delete-account", deleteAccountController);

export default router;