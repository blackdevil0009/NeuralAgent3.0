import { type FunctionDeclaration } from "@google/genai";
import { Server } from "socket.io";

export const vaidyamedxToolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_patient_context",
    description: "Fetch the patient's wellness profile, health logs, and current score from the VaidyaMed-X backend.",
  },
];

// In a full integration, you would fetch this from the Flask backend using the token passed during socket connection.
// For now, this returns a comprehensive, static medical summary that Gemini can use in real-time.
export async function handleVaidyaMedxAction(
  fc: any,
  io: Server,
  patientData: any = null
) {
  try {
    if (fc.name === "get_patient_context") {
      io.emit("system_status", "[AI DOCTOR] Fetching patient records from VaidyaMed-X backend...");
      
      // If we received dynamic patient data from the frontend, return it!
      if (patientData) {
         return {
           id: fc.id,
           name: fc.name,
           response: {
             result: patientData,
             message: "Successfully retrieved live patient data from VaidyaMed-X."
           }
         };
      }

      // Fallback context if no live token data was provided
      return {
        id: fc.id,
        name: fc.name,
        response: {
          result: {
             patient_status: "Active User",
             wellness_score: 82,
             recent_logs: "Sleep: 6 hours, Water: 1200ml, Diet: Good, Stress Level: 4",
             medical_history: "No critical conditions. Occasional mild acidity and fatigue.",
             ai_recommendation: "Advise patient to increase water intake to 2000ml and aim for 7.5 hours of sleep."
          },
          message: "Successfully retrieved fallback medical context.",
        },
      };
    }
    
    return null;
  } catch (error: any) {
    console.error("[VAIDYAMEDX AGENT ERROR]", error);
    return {
      id: fc.id,
      name: fc.name,
      response: {
        error: error.message || "Failed to execute VaidyaMed-X action.",
      },
    };
  }
}
