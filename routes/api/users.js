const router = require("express").Router();
const pool = require("../../database");
const crypto = require("crypto");
const jsonwebtoken = require("jsonwebtoken");
const { key, keyPub } = require("../../keys");
const nodemailer = require("nodemailer");
const currentDate = new Date();
const expDate = new Date(currentDate.getTime() + 2 * 60 * 60 * 1000);
const formattedDate = expDate.toISOString().slice(0, 19).replace("T", " ");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "olivier.dwwm@gmail.com",
    pass: "csmx kdcb oqpk nrga",
  },
});

const multer = require("multer");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "../../upload/avatar"));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 80000,
  },
  fileFilter: (req, file, cb) => {
    console.log(file);
    cb(null, true);
  },
});

router.get("/getUser/:id", (req, res) => {
  console.log(req.params);
  let id = req.params.id;
  const sql =
    "SELECT idUser, pseudo, email, avatar, admin FROM users where idUser= ?";
  pool
    .query(sql, [id])
    .then((result) => {
      res.status(200).json(result[0]);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

router.get("/verifyMail/:token", (req, res) => {
  const token = req.params.token;
  console.log(token);
  const formattedDateVerify = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  console.log(formattedDateVerify);
  const sqlVerifyMailToken = `SELECT * FROM users WHERE emailToken = ?  AND ? < expDate`;
  pool
    .query(sqlVerifyMailToken, [token, formattedDateVerify])
    .then((result) => {
      console.log(result.length);
      if (result.length === 0) {
        console.log("IF");
        res.status(200).json({ message: "Token invalide et/ou date expirée" });
      } else {
        console.log("ELSE");
        const idUser = result[0].idUser;
        const updateUserAfterConfirm = `UPDATE users SET emailToken = null, verify= 1, expDate = null  WHERE idUser = ? `;
        return pool.query(updateUserAfterConfirm, [idUser]);
      }
    })
    .then((result) => {
      res.status(200).json({ message: "Inscription validée" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

router.get("/current", async (req, res) => {
  const token = req.cookies ? req.cookies.token : null;
  console.log({ token });
  if (token) {
    try {
      const decodedToken = jsonwebtoken.verify(token, keyPub, {
        algorithms: "RS256",
      });
      const sql = `SELECT idUser, pseudo, email, avatar, admin from users WHERE idUser= ?`;
      pool
        .query(sql, [decodedToken.sub])
        .then((result) => {
          const currentUser = result[0];
          if (currentUser) {
            res.json(currentUser);
          } else {
            res.json(null);
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ messageError: "Internal Server Error" });
        });
    } catch (error) {
      res.json(null);
    }
  } else {
    res.json(null);
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  const sqlVerifyMail =
    "Select idUser, password, verify, admin FROM users WHERE email=?";
  pool
    .query(sqlVerifyMail, [email])
    .then(async (result) => {
      console.log(result[0]);
      try {
        if (result[0].length === 0) {
          console.log("No results");
          res.status(400).json("Email et/ou mot de passe incorrects !");
        } else {
          console.log("Results OK");
          console.log(result[0]);
          const user = result[0][0];
          const dbPassword = user.password;
          console.log({ password });
          console.log({ dbPassword });
          const passwordMatch = await bcrypt.compare(password, dbPassword);
          console.log({ passwordMatch });
          if (passwordMatch) {
            console.log("Password Match");
            if (user.verify == 1) {
              if (user.admin != 1) {
                console.log("I'm not an admin");
                const token = jsonwebtoken.sign({}, key, {
                  subject: user.idUser.toString(),
                  expiresIn: 3600 * 2,
                  algorithm: "RS256",
                });
                res.cookie("token", token, {
                  maxAge: 3600 * 2 * 1000,
                  httpOnly: true,
                  sameSite: "None",
                  secure: true,
                  // domain: "serie-front-olivier-webdev.vercel.app",
                  // path: "/",
                });
                console.log("token généré", token);
                res.json(user);
              } else {
                console.log("I'm an admin");

                res.status(200).json(user);
              }
            } else {
              console.log("Inscription non validée");
              res
                .status(400)
                .json("Vous n'avez pas validé votre inscription par mail !");
            }
          } else {
            console.log("password didn't match");
            res.status(400).json("Email et/ou mot de passe incorrects !");
          }
        }
      } catch (error) {
        console.log("There's an error", error);
        res.status(400).json("Email et/ou mot de passe incorrects !");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

router.get("/resetPassword/:email", (req, res) => {
  console.log(req.params.email);
  const email = req.params.email;
  const sqlSearchMail = `SELECT * FROM users WHERE email = ?`;
  pool
    .query(sqlSearchMail, [email])
    .then((result) => {
      if (result.length !== 0) {
        const confirmLink = `https://serie-front-olivier-webdev.vercel.app/resetPassword?email=${email}`;
        const mailOptions = {
          from: "olivier.dwwm@gmail.com",
          to: email,
          subject: "Mot de passe oublié Serie Blog",
          text: `Cliquez sur ce lien pour modifier votre mot de passe : ${confirmLink}`,
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            throw err;
          } else {
            res
              .status(200)
              .json({ messageGood: "Vous allez recevoir un mail !" });
          }
        });
      } else {
        res.json({
          messageError: "Ce mail n'existe pas dans notre base de données",
        });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

router.post("/modifyPassword", async (req, res) => {
  console.log(req.body);
  const { password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sqlModifyPasswd = `UPDATE users SET password = ? WHERE email = ?`;
  pool
    .query(sqlModifyPasswd, [hashedPassword, email])
    .then((result) => {
      res.json({ message: "Mot de passe modiifé, vous allez être redirigé !" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

router.post("/register", upload.single("avatar"), async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.file);
    let avatar;
    if (req.file && req.file.filename) {
      avatar = req.file.filename;
    } else {
      avatar = null;
    }
    const { username, email, password } = req.body;
    let admin = 0;
    let verify = 0;

    const [result] = await pool.query("SELECT * FROM users WHERE email= ?", [
      email,
    ]);

    if (result.length) {
      let isEmail = { message: "Email existant" };
      if (avatar) {
        const filePath = path.join(__dirname, "../../upload/avatar", avatar);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log("Erreur suppression fichier");
          }
          console.log("Fichier supprimé");
        });
      }
      res.status(200).json(isEmail);
    } else {
      let emailToken = crypto.randomBytes(64).toString("hex");
      const hashedPassword = await bcrypt.hash(password, 10);
      const formattedDate = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const [insertResult] = await pool.query(
        "INSERT INTO users (pseudo, email, password, avatar, admin, verify, emailToken, expDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          username,
          email,
          hashedPassword,
          avatar,
          admin,
          verify,
          emailToken,
          formattedDate,
        ]
      );

      const confirmLink = `https://serie-front-olivier-webdev.vercel.app/confirmEmail?token=${emailToken}`;
      const mailOptions = {
        from: "olivier.dwwm@gmail.com",
        to: email,
        subject: "Confirmation inscription Serie Blog",
        text: `Cliquez sur le lien suivant pour valider votre inscription : ${confirmLink}`,
      };

      await transporter.sendMail(mailOptions);

      let isEmail = {
        messageGood:
          "Inscription à confirmer par email ! Vous allez être redirigé(e)",
      };
      res.status(200).json(isEmail);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ messageError: "Internal Server Error" });
  }
});

router.delete("/", (req, res) => {
  res.clearCookie(
    "token"
    // , {
    //   domain: ".vercel.app",
    //   path: "/",
    //   secure: true,
    //   httpOnly: true,
    //   sameSite: "None",
    // }
  );
  res.end();
});

module.exports = router;
