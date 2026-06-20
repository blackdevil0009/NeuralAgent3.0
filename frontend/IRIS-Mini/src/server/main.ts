import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { startIrisVoice, stopIrisVoice, sendVisionFrame, sendTextMessage } from "./agent/iris-voice.js";
import { getAvailablePort } from "./lib/port-picker.js";
import path from "path";
import { fileURLToPath } from "url";

if (process.env.NODE_ENV === "production") {
  const originalStdout = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
    if (typeof chunk === "string" && chunk.includes("[vite-express]")) return true;
    return originalStdout(chunk, encoding, callback);
  }) as any;

  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
    if (typeof chunk === "string" && (chunk.includes("DEP0205") || chunk.includes("DeprecationWarning"))) {
      return true;
    }
    return originalStderr(chunk, encoding, callback);
  }) as any;

  process.on("warning", (warning) => {
    if (warning.name === "DeprecationWarning") return;
  });
}

const app = express();
const server = http.createServer(app);

// Removed ViteExpress config

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("Sudarshan_Connected", (msg) => {
    let patientData = null;
    if (typeof msg === 'object' && msg.patientData) {
      patientData = msg.patientData;
    }
    startIrisVoice(io, patientData);
  });

  socket.on("Sudarshan_Disconnected", (msg) => {
    stopIrisVoice(io);
  });

  socket.on("camera_frame", (base64Data) => {
    sendVisionFrame(base64Data);
  });

  socket.on("chat_message", (text) => {
    sendTextMessage(text);
  });

  socket.on("disconnect", () => {
    stopIrisVoice(io);
  });
});

const startServer = async () => {
  const port = await getAvailablePort(6753, 8769);

  server.listen(port, () => {
    console.clear();
    console.clear();

    const banner = `
\x1b[32m
  ██████╗ ██╗   ██╗██████╗  █████╗ ██████╗ ███████╗██╗  ██╗██████╗ ███╗   ██╗
 ██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗████╗  ██║
 ███████╗ ██║   ██║██║  ██║███████║██████╔╝███████╗███████║██████╔╝██╔██╗ ██║
 ╚════██║ ██║   ██║██║  ██║██╔══██║██╔══██╗╚════██║██╔══██║██╔══██╗██║╚██╗██║
 ██████╔╝ ╚██████╔╝██████╔╝██║  ██║██║  ██║███████║██║  ██║██║  ██║██║ ╚████║
 ╚═════╝   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝
\x1b[0m
\x1b[36m [ NEURAL CORE ONLINE ]\x1b[0m
\x1b[35m [ UI PORT ] \x1b[0m http://localhost:${port}
\x1b[35m [ AGENT ]   \x1b[0m Awaiting Connection...
\x1b[90m [ EXIT ]    \x1b[0m Press \x1b[31mCtrl + C\x1b[0m to stop
========================================================
\x1b[36m CREATED BY \x1b[0m Govind Sharma (\x1b[32m@mirafuturetech\x1b[0m)
\x1b[36m FOUNDER OF \x1b[0m Mira Future Tech Vision
========================================================
`;
    process.stdout.write(banner + "\n");
  });

  if (process.env.NODE_ENV === "production") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    app.use(express.static(__dirname));

    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, "index.html"));
    });
  }
  // ViteExpress binding removed so it acts as headless backend
};

startServer();
