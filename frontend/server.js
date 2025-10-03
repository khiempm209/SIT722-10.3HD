require("./src/configs/db");

const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

const http = require("http").createServer(app);
http.keepAliveTimeout = 65000; 
http.headersTimeout = 66000;

const io = require("socket.io")(http);

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:3030";

app.set("trust proxy", 1);
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" })); // parse application/json
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 

const routes = require("./src/routes/api");

app.get("/api/health", (_req, res) => res.json({ ok: true }));
// let shuttingDown = false;
// app.get("/api/ready", (_req, res) => {
//   if (shuttingDown) return res.status(503).json({ ready: false });
//   res.json({ ready: true });
// });
// ---------- Static frontend ----------
const PUBLIC_DIR = path.join(__dirname, "public");
// app.use(express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR, { index: "./chatbot.html" }))

app.use("/api", routes);

app.get("/:conversationId", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "chatbot.html"));
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("message_chatbot", async (params) => {
    // console.log("start", query);
    try {
      const resp = await fetch(`${CHAT_SERVICE_URL}/inference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: params['text'], history: params['history']}),
      });

      if (!resp.ok) {
        const text = await resp.text();
        socket.emit("chunk_response", { message: "Upstream error: " +  params['text'] });
        return;
      }

      for await (const chunk of resp.body) {
        let process_chunk = JSON.parse(Buffer.from(chunk).toString('utf8'))['text'];
        socket.emit("chunk_response", { process_chunk });
      }
     
      socket.emit("done", { message: "done" });
    } catch (err) {
      console.error("broadcaster fetch error", err);
      socket.emit("error", { message: String(err) });
    }
  });
});

const PORT = process.env.PORT || 3020;
http.listen(PORT, () => {
  console.log(`ADS app running at http://localhost:${PORT}`);
});
