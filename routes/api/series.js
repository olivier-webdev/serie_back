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

  pool
    .query(sqlInsert, [
      title,
      poster,
      year,
      resume,
      numberSeason,
      still,
      imdbNote,
      sensCritiqueNote,
      country,
    ])
    .then((result) => {
      console.log(result);
      let id = result[0].insertId;
      const sqlSelect = "SELECT * FROM series WHERE idSerie= ?";
      return pool.query(sqlSelect, [id]);
    })
    .then((result) => {
      res
        .status(200)
        .json({ messageGood: "Série insérée", newSerie: result[0] });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

router.get("/getSeries", (req, res) => {
  const sql = "SELECT * FROM series";
  pool
    .query(sql)
    .then((result) => {
      console.log("Séries récupérées");
      res.json(result);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
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
    pool
      .query(getPosterSql, [idSerie])
      .then((result) => {
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
          return pool.query(updateRequest, [
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
          ]);
        });
      })
      .then((result) => {
        const getAllSql = "SELECT * FROM series WHERE idSerie= ?";
        return pool.query(getAllSql, [idSerie]);
      })
      .then((result) => {
        res
          .status(200)
          .json({ messageGood: "Série modifiée", newSerie: result[0] });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ messageError: "Internal Server Error" });
      });
  } else {
    const updateRequest = `UPDATE series
      SET title = ?, year= ?, resume = ?, numberSeason = ?, still = ?,
       imdbNote = ?, sensCritiqueNote = ?, country = ?
       WHERE idSerie= ?`;
    pool
      .query(updateRequest, [
        title,
        year,
        resume,
        numberSeason,
        still,
        imdbNote,
        sensCritiqueNote,
        country,
        idSerie,
      ])
      .then((result) => {
        const getAllSql = "SELECT * FROM series WHERE idSerie= ?";
        return pool.query(getAllSql, [idSerie]);
      })
      .then((result) => {
        res
          .status(200)
          .json({ messageGood: "Série modifiée", newSerie: result[0] });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ messageError: "Internal Server Error" });
      });
  }
});

router.delete("/deleteSerie/:id", (req, res) => {
  const id = req.params.id;
  console.log(id);
  const getPosterSql = "SELECT * FROM series WHERE idSerie= ?";
  pool
    .query(getPosterSql, [id])
    .then((result) => {
      console.log({ result });
      let poster = result[0].poster;
      const filePath = path.join(__dirname, "../../upload/poster", poster);
      console.log({ filePath });
      fs.unlink(filePath, (err) => {
        if (err) throw err;
        console.log("Fichier supprimé");
        const deleteSql = "DELETE FROM series WHERE idSerie= ?";
        return pool.query(deleteSql, [id]);
      });
    })
    .then((result) => {
      res.sendStatus(200);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ messageError: "Internal Server Error" });
    });
});

module.exports = router;
