const express = require("express");
const path = require("path");
const cookie = require("cookie-parser");
require("dotenv").config();

const app = express();
app.use(express.static(path.join(__dirname, "upload")));
app.use(cookie());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 8000;

require("./database");

const routes = require("./routes");

const allowedOrigin = "https://serie-front-olivier-webdev.vercel.app";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(routes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Serveur écoutant sur le port ${port}`);
});
