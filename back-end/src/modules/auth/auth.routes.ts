import { Request, Response, NextFunction, Router } from "express";
import {
  createUporabnik,
  findUserByUsername,
} from "../../config/db.js";

const router = Router();

const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let {
      username,
      password,
      firstName,
      lastName,
    } = req.body as {
      username?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    username = username?.trim();
    password = password?.trim();
    firstName = firstName?.trim();
    lastName = lastName?.trim();

    if (!username || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: "Username, password, firstName and lastName are required.",
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

    const queryResult = await createUporabnik(
      username,
      password,
      firstName,
      lastName
    );

    if (queryResult.affectedRows === 1) {
      res.status(201).json({
        success: true,
        message: "User registered.",
        user: {
          id: queryResult.insertId,
          username,
          firstName,
          lastName,
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
        firstName: user.ime,
        lastName: user.priimek,
      },
    });
  } catch (error) {
    next(error);
  }
};

router.post("/register", registerController);
router.post("/login", loginController);

export default router;