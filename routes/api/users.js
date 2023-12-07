const router = require("express").Router();
const connection = require("../../database");
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
  connection.query(sql, [id], (err, result) => {
    if (err) throw err;
    res.status(200).json(result[0]);
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
  connection.query(
    sqlVerifyMailToken,
    [token, formattedDateVerify],
    (err, result) => {
      console.log(result.length);
      if (err) throw err;
      if (result.length === 0) {
        console.log("IF");
        res.status(200).json({ message: "Token invalide et/ou date expirée" });
      } else {
        console.log("ELSE");
        const idUser = result[0].idUser;
        const updateUserAfterConfirm = `UPDATE users SET emailToken = null, verify= 1, expDate = null  WHERE idUser = ? `;
        connection.query(updateUserAfterConfirm, [idUser], (err, result) => {
          if (err) throw err;
          res.status(200).json({ message: "Inscription validée" });
        });
      }
    }
  );
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
      connection.query(sql, [decodedToken.sub], (err, result) => {
        const currentUser = result[0];
        if (currentUser) {
          res.json(currentUser);
        } else {
          res.json(null);
        }
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
  const sqlVerifyMail =
    "Select idUser, password, verify, admin FROM users WHERE email=?";
  connection.query(sqlVerifyMail, [email], async (err, result) => {
    try {
      if (result.length === 0) {
        res.status(400).json("Email et/ou mot de passe incorrects !");
      } else {
        const dbPassword = result[0].password;
        const passwordMatch = bcrypt.compareSync(password, dbPassword);
        if (passwordMatch) {
          if (result[0].verify == 1) {
            if (result[0].admin != 1) {
              const token = jsonwebtoken.sign({}, key, {
                subject: result[0].idUser.toString(),
                expiresIn: 3600 * 24 * 30 * 6,
                algorithm: "RS256",
              });
              res.cookie("token", token, {
                maxAge: 3600 * 2 * 1000,
                httpOnly: true,
              });
              console.log("token généré", token);
              res.json(result[0]);
            } else {
              res.status(200).json(result[0]);
            }
          } else {
            res
              .status(400)
              .json("Vous n'avez pas validé votre inscription par mail !");
          }
        } else {
          res.status(400).json("Email et/ou mot de passe incorrects !");
        }
      }
    } catch (error) {
      res.status(400).json("Email et/ou mot de passe incorrects !");
    }
  });
});

router.get("/resetPassword/:email", (req, res) => {
  console.log(req.params.email);
  const email = req.params.email;
  const sqlSearchMail = `SELECT * FROM users WHERE email = ?`;
  connection.query(sqlSearchMail, [email], (err, result) => {
    if (err) throw err;
    console.log({ result });
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
  });
});

router.post("/modifyPassword", async (req, res) => {
  console.log(req.body);
  const { password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sqlModifyPasswd = `UPDATE users SET password = ? WHERE email = ?`;
  connection.query(sqlModifyPasswd, [hashedPassword, email], (err, result) => {
    if (err) throw err;
    res.json({ message: "Mot de passe modiifé, vous allez être redirigé !" });
  });
});

router.post("/register", upload.single("avatar"), async (req, res) => {
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
  const sqlVerify = "SELECT * FROM users WHERE email= ?";
  const hashedPassword = await bcrypt.hash(password, 10);
  connection.query(sqlVerify, [email], (err, result) => {
    if (err) throw err;
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
      const sqlInsert = `INSERT INTO users
         (pseudo, email, password, avatar, admin, verify, emailToken, expDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      connection.query(
        sqlInsert,
        [
          username,
          email,
          hashedPassword,
          avatar,
          admin,
          verify,
          emailToken,
          formattedDate,
        ],
        (err, result) => {
          if (err) throw err;
          const confirmLink = `https://serie-front-olivier-webdev.vercel.app/confirmEmail?token=${emailToken}`;
          const mailOptions = {
            from: "olivier.dwwm@gmail.com",
            to: email,
            subject: "Confirmation inscription Serie Blog",
            text: `Cliquez sur le lien suivant pour valider votre inscription : ${confirmLink}`,
          };
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              // console.error("Erreur lors de l'envoi du mail");
              throw err;
            } else {
              let isEmail = {
                messageGood:
                  "Inscription à confirmer par email ! Vous allez être redirigé(e)",
              };
              res.status(200).json(isEmail);
            }
          });
        }
      );
    }
  });
});

router.delete("/", (req, res) => {
  res.clearCookie("token");
  res.end();
});

module.exports = router;
