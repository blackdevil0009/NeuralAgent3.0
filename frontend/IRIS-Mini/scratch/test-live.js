import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import StreamConfig from "../dist/constants/StreamConfig.js"; // compiled version or import raw TS using tsx

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("API Key missing!");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper to compute StreamConfig manually just in case
const getModel = () => {
  const cipher = [
    93, 91, 99, 95, 100, 95, 35, 41, 36, 39, 35, 92, 98, 87, 105, 94, 35, 98,
    95, 108, 91, 35, 102, 104, 91, 108, 95, 91, 109,
  ];
  const signature = String.fromCharCode(83, 85, 68, 65, 82, 83, 72, 65, 78);
  const shiftKey = 10; // signature "SUDARSHAN" matches
  return String.fromCharCode(...cipher.map((char) => char + shiftKey));
};

const modelName = getModel();
console.log("Using model:", modelName);

async function run() {
  try {
    const session = await ai.live.connect({
      model: modelName,
      config: {
        systemInstruction: {
          parts: [{ text: "You are a helpful assistant." }],
        },
        responseModalities: ["AUDIO"],
      },
      callbacks: {
        onmessage: (msg) => {
          console.log("onmessage:", JSON.stringify(msg));
        },
        onerror: (err) => {
          console.error("onerror:", err);
        },
        onclose: () => {
          console.log("onclose: connection closed");
        }
      }
    });

    console.log("Connected successfully!");
    
    // Wait for 5 seconds to see if it closes
    setTimeout(() => {
      console.log("Closing session...");
      session.close();
      process.exit(0);
    }, 5000);

  } catch (err) {
    console.error("Connection failed catch block:", err);
  }
}

run();
