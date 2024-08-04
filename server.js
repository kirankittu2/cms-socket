import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import dotenv from "dotenv";
import WebSocket, { WebSocketServer } from "ws";
const env = process.env.NODE_ENV || "development";

if (env === "development") {
  dotenv.config({ path: ".env.local" });
} else if (env === "production") {
  dotenv.config({ path: ".env.prod" });
}

const upload = multer({ dest: "uploads" });
const app = express();
const port = 3002;

app.listen(port);

app.use(
  cors({
    origin: process.env.ORIGIN,
    optionsSuccessStatus: 200,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Hello");
});

app.post("/files/upload", upload.array("files"), (req, res) => {
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

app.post("/files/delete", async (req, res) => {
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

// Web Socket Configuration
const wss = new WebSocketServer({
  port: 3003,
});

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    wss.clients.forEach((client) => {
      client.send(message);
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});
