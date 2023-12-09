const mysql = require("mysql2");
require("dotenv").config();

// const connection = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "eval_serie",
// });

connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error getting database connection:", err);
    return;
  }
  console.log("Connected to the database");

  connection.ping((pingErr) => {
    connection.release();
    if (pingErr) {
      console.error("Error pinging database:", pingErr);
    } else {
      console.log("Database connection is active");
    }
  });
});

module.exports = pool.promise();

// connection.connect((err) => {
//   if (err) throw err;
//   console.log("connecté à la base de données");
// });

// module.exports = connection;
