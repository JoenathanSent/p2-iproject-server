const { pwdValidation, hash } = require("../helpers/bcryptjs");
const { generateToken } = require("../helpers/jwt");
const sendNodemailer = require("../helpers/nodemailer");
const { User } = require("../models");
const { OAuth2Client } = require("google-auth-library");
class UserController {
  static async login(req, res, next) {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({
        where: {
          username,
        },
      });

      if (!user) {
        throw { name: "Fail Login", message: "Wrong username / password!" };
      }

      const isMatch = pwdValidation(password, user.password);

      if (!isMatch) {
        throw { name: "Fail Login", message: "Wrong username / password!" };
      }

      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
      };
      const token = generateToken(payload);
      res.status(200).json({
        code: 200,
        message: "Success Login",
        username: user.username,
        email: user.email,
        access_token: token,
      });
    } catch (err) {
      next(err);
    }
  }

  static async register(req, res, next) {
    const { username, password, email, name } = req.body;
    const newUser = {
      username,
      password,
      email,
      name,
      balance: 0,
    };
    try {
      const user = await User.create(newUser);
      if (user) {
        sendNodemailer(
          email,
          "Registration success",
          "Congratulations, you have successfully registered on Remempay!"
        );
        res.status(201).json({
          code: 201,
          message: "Success create account",
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          balance: user.balance,
        });
      }
    } catch (err) {
      next(err);
    }
  }

  static async googleLogin(req, res, next) {
    try {
      const GOOGLE_CLIENT_ID = process.env.google_client_id;
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      let idToken = req.body.idToken;
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      let token;
      let user = await User.findOne({
        where: {
          email: payload.email,
        },
      });
      if (user) {
        token = generateToken({
          id: user.id,
          username: user.username,
          name: user.name,
        });
        res.status(200).json({ token });
      } else {
        const newUser = await User.create({
          username: payload.name.trim(),
          email: payload.email,
          name: payload.email,
          balance: 0,
          password: hash(payload.email),
        });
        res.status(201).json({ email: newUser.email });
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}

module.exports = UserController;
