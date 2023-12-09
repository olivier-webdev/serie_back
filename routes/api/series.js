const router = require("express").Router();
const pool = require("../../database");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "../../upload/poster"));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 3000000,
  },
  fileFilter: (req, file, cb) => {
    console.log(file);
    cb(null, true);
  },
});

router.post("/addSerie", upload.single("poster"), (req, res) => {
  console.log(req.body);
  console.log(req.file);
  const {
    title,
    year,
    resume,
    numberSeason,
    imdbNote,
    sensCritiqueNote,
    country,
  } = req.body;
  const still = req.body.still == true ? 1 : 0;
  let poster = req.file.filename;
  const sqlInsert = `INSERT INTO series
     (title, poster, year, resume, numberSeason, still, imdbNote, sensCritiqueNote, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  pool.query(
    sqlInsert,
    [
      title,
      poster,
      year,
      resume,
      numberSeason,
      still,
      imdbNote,
      sensCritiqueNote,
      country,
    ],
    (err, result) => {
      if (err) throw err;
      console.log(result);
      let id = result.insertId;
      const sqlSelect = "SELECT * FROM series WHERE idSerie= ?";
      pool.query(sqlSelect, [id], (err, result) => {
        if (err) throw err;
        res
          .status(200)
          .json({ messageGood: "Série insérée", newSerie: result[0] });
      });
    }
  );
});

router.get("/getSeries", (req, res) => {
  const sql = "SELECT * FROM series";
  pool.query(sql, (err, result) => {
    if (err) throw err;
    console.log("Séries récupérées");
    res.json(result);
  });
});

router.patch("/modifySerie", upload.single("poster"), (req, res) => {
  console.log(req.body);
  const {
    idSerie,
    title,
    year,
    resume,
    numberSeason,
    still,
    imdbNote,
    sensCritiqueNote,
    country,
  } = req.body;
  console.log(req.file);
  if (req.file) {
    let newPoster = req.file.filename;
    const getPosterSql = "SELECT * FROM series WHERE idSerie= ?";
    pool.query(getPosterSql, [idSerie], (err, result) => {
      if (err) throw err;
      console.log({ result });
      let poster = result[0].poster;
      const filePath = path.join(__dirname, "../../upload/poster", poster);
      fs.unlink(filePath, (err) => {
        if (err) throw err;
        console.log("Fichier supprimé");
        const updateRequest = `UPDATE series
        SET title = ?, poster=?, year= ?, resume = ?, numberSeason = ?, still = ?,
         imdbNote = ?, sensCritiqueNote = ?, country = ?
         WHERE idSerie= ?`;
        pool.query(
          updateRequest,
          [
            title,
            newPoster,
            year,
            resume,
            numberSeason,
            still,
            imdbNote,
            sensCritiqueNote,
            country,
            idSerie,
          ],
          (err, result) => {
            if (err) throw err;
            const getAllSql = "SELECT * FROM series WHERE idSerie= ?";
            pool.query(getAllSql, [idSerie], (err, result) => {
              res
                .status(200)
                .json({ messageGood: "Série modifiée", newSerie: result[0] });
            });
          }
        );
      });
    });
  } else {
    const updateRequest = `UPDATE series
    SET title = ?, year= ?, resume = ?, numberSeason = ?, still = ?,
     imdbNote = ?, sensCritiqueNote = ?, country = ?
     WHERE idSerie= ?`;
    pool.query(
      updateRequest,
      [
        title,
        year,
        resume,
        numberSeason,
        still,
        imdbNote,
        sensCritiqueNote,
        country,
        idSerie,
      ],
      (err, result) => {
        if (err) throw err;
        const getAllSql = "SELECT * FROM series WHERE idSerie= ?";
        pool.query(getAllSql, [idSerie], (err, result) => {
          res
            .status(200)
            .json({ messageGood: "Série modifiée", newSerie: result[0] });
        });
      }
    );
  }
});

// router.patch("/likedThisOne", (req, res) => {
//   const id = req.body.id;
//   const like = req.body.like === true ? 0 : 1;
//   const updateSql = "UPDATE series SET `like`=? WHERE id=?";
//   pool.query(updateSql, [like, id], (err, results) => {
//     if (err) throw err;
//     console.log("Série modifiée en BDD");
//     res.json(req.body);
//   });
// });

router.delete("/deleteSerie/:id", (req, res) => {
  const id = req.params.id;
  console.log(id);
  const getPosterSql = "SELECT * FROM series WHERE idSerie= ?";
  pool.query(getPosterSql, [id], (err, result) => {
    if (err) throw err;
    console.log({ result });
    let poster = result[0].poster;
    const filePath = path.join(__dirname, "../../upload/poster", poster);
    console.log({ filePath });
    fs.unlink(filePath, (err) => {
      if (err) throw err;
      console.log("Fichier supprimé");
      const deleteSql = "DELETE FROM series WHERE idSerie= ?";
      pool.query(deleteSql, [id], (err, result) => {
        if (err) throw err;
      });
    });
    res.sendStatus(200);
  });
});
module.exports = router;
