import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

const upload = multer({ dest: "uploads" });
const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("uploads"));

app.post("/upload", upload.array("files"), (req, res) => {
  const files = req.files;

  for (const file of files) {
    if (file.mimetype == "image/svg+xml") {
      fs.readFile(file.path, "utf8", (err, data) => {
        if (err) {
          return res.status(500).send("Error reading SVG file");
        }
        if (!data.includes("<?xml")) {
          const updatedContent = `<?xml version="1.0" encoding="UTF-8"?>\n${data}`;
          fs.writeFile(file.path, updatedContent, "utf8", (err) => {
            if (err) {
              return res.status(500).send("Error writing SVG file");
            }
          });
        }
      });
    }
  }

  res.send(files);
});

app.get("/image/:identifier", (req, res) => {
  const identifier = req.params.identifier;
  const imagePath = path.join(process.cwd(), "uploads", identifier);

  if (fs.existsSync(imagePath)) {
    const imageStream = fs.createReadStream(imagePath);
    imageStream.pipe(res);
  } else {
    res.status(404).send("Image not found");
  }
});

app.post("/delete", async (req, res) => {
  const fileNamesToDelete = req.body.filenames;
  for (const fileName of fileNamesToDelete) {
    const filePath = `./uploads/${fileName}`;

    try {
      await fsPromises.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: `File ${fileName} not found` });
    }

    await fsPromises.unlink(filePath);
  }
  res.json({ status: true });
});

// app.get("/all-images", (req, res) => {
//   res.send("Here is all your images");
// });

app.listen(3001);
