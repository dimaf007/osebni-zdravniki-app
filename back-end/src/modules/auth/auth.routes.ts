import { Request, Response, NextFunction, Router } from "express";
import {
  createUporabnik,
  findUserByEmail,
  findUserByUsername,
} from "../../config/db.js";

const router = Router();

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

    username = username?.trim();
    email = email?.trim().toLowerCase();
    password = password?.trim();

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Username, email and password are required.",
      });
      return;
    }

    const existingUsers = await findUserByUsername(username);

    if (existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        message: "Username is already taken.",
      });
      return;
    }

    const existingEmails = await findUserByEmail(email);

    if (existingEmails.length > 0) {
      res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
      return;
    }

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

    res.status(500).json({
      success: false,
      message: "User was not registered.",
    });
  } catch (error) {
    next(error);
  }
};

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

    username = username?.trim();
    password = password?.trim();

    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
      return;
    }

    const users = await findUserByUsername(username);

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: "User is not registered.",
      });
      return;
    }

    const user = users[0];

    if (password !== user.user_password) {
      res.status(401).json({
        success: false,
        message: "Incorrect password.",
      });
      return;
    }

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

router.post("/register", registerController);
router.post("/login", loginController);

export default router;