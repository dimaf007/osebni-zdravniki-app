// Modul za avtentikacijo uporabnikov.
// Datoteka definira API poti za registracijo, prijavo,
// brisanje uporabniškega računa in ponastavitev gesla.
// Tukaj izvajamo osnovno validacijo vhodnih podatkov,
// preverjamo obstoj uporabnika v bazi
// ter vračamo ustrezne HTTP odgovore glede na rezultat operacije.

import { Request, Response, NextFunction, Router } from "express";
import {
  createUporabnik,
  deleteUserAccountByUserId,
  findUserByEmail,
  findUserByUsername,
  createPasswordResetCode,
  findUserByResetCode,
  updateUserPasswordWithResetCode,
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

// Ta funkcija ustvari naključno 6-mestno številčno kodo.
// Koda je primerna za demonstracijo ponastavitve gesla,
// v realnem sistemu pa bi bila poslana po e-pošti ali SMS.
function generateResetCode(): string {
  const min = 100000; // najnižja 6-mestna številka
  const max = 999999; // najvišja 6-mestna številka

  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(code);
}

// Kontroler za zahtevo ponastavitve gesla.
// Uporabnik vnese svoj e-poštni naslov, sistem poišče uporabnika
// in ustvari enkratno 6-mestno kodo v tabeli password_reset.
// Ker e-mail prehod ni konfiguriran, se koda ne pošlje po e-pošti,
// ampak se vrne v odzivu in jo front-end sam uporabi v demonstracijskem scenariju.
const requestPasswordResetController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { email } = req.body as { email?: string };

    // Počistimo e-poštni naslov.
    email = email?.trim().toLowerCase();

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required for password reset.",
      });
      return;
    }

    const users = await findUserByEmail(email);

    // Zaradi varnosti ne razkrivamo, ali uporabnik obstaja ali ne.
    // Če uporabnik ne obstaja, vseeno vrnemo uspešen odziv brez kode.
    if (users.length === 0) {
      res.status(200).json({
        success: true,
        message:
          "If a user with this email exists, a reset code has been generated.",
      });
      return;
    }

    const user = users[0];

    // Ustvarimo 6-mestno reset kodo in jo shranimo v tabelo password_reset.
    const resetCode = generateResetCode();
    await createPasswordResetCode(user.uporabnik_id, resetCode);

    // V tej učni implementaciji e-mail prehod ni konfiguriran,
    // zato kodo vrnemo neposredno v odzivu, da jo lahko front-end
    // samodejno uporabi v demonstracijskem scenariju ponastavitve gesla.
    res.status(200).json({
      success: true,
      message:
        "Reset code has been generated. In a real system it would be sent via email.",
      resetCode,
    });
  } catch (error) {
    next(error);
  }
};

// Kontroler za dejansko ponastavitev gesla.
// Sprejme reset kodo in novo geslo, poišče uporabnika na podlagi kode,
// nato pa posodobi geslo in označi reset zapis kot uporabljen.
const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { resetCode, newPassword } = req.body as {
      resetCode?: string;
      newPassword?: string;
    };

    // Počistimo vhodne podatke.
    resetCode = resetCode?.trim();
    newPassword = newPassword?.trim();

    if (!resetCode || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Reset code and new password are required.",
      });
      return;
    }

    // Poiščemo uporabnika na podlagi še neuporabljene reset kode.
    const users = await findUserByResetCode(resetCode);

    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: "Reset code is invalid or has already been used.",
      });
      return;
    }

    const user = users[0];

    // Posodobimo geslo in označimo reset zapis kot uporabljen.
    const updated = await updateUserPasswordWithResetCode(
      user.uporabnik_id,
      newPassword,
      resetCode
    );

    if (!updated) {
      res.status(500).json({
        success: false,
        message: "Password was not reset.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Definicija API poti modula auth.
router.post("/register", registerController);
router.post("/login", loginController);
router.delete("/delete-account", deleteAccountController);

// Učne poti za ponastavitev gesla brez dejanskega e-mail prehoda.
router.post("/request-password-reset", requestPasswordResetController);
router.post("/reset-password", resetPasswordController);

export default router;