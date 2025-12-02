import { GoogleGenAI, Type } from "@google/genai";
import { Car, MaintenanceRecord, MaintenanceSuggestion } from "../types";

// Initialize the client safely
// We use the env variable if available, otherwise fallback to the hardcoded key provided by the user
const apiKey = process.env.API_KEY || "AIzaSyCqpGBL2oEj0jzjBKOicFaJHI7A8YlO-7Y";

// Debug log (veilig)
if (!apiKey) {
  console.error("CRITICAL: API_KEY is undefined.");
} else {
  console.log(`Gemini Service gestart. API Key aanwezig (start met: ${apiKey.substring(0, 4)}...)`);
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const getMaintenanceAdvice = async (
  car: Car,
  history: MaintenanceRecord[]
): Promise<MaintenanceSuggestion[]> => {
  if (!apiKey) {
    console.error("API_KEY ontbreekt. Kan geen advies ophalen.");
    return [];
  }

  try {
    // Check for custom user intervals to prioritize
    let intervalContext = "";
    if (car.customMaintenanceIntervals && car.customMaintenanceIntervals.length > 0) {
        intervalContext = "De gebruiker heeft de volgende EIGEN onderhoudsintervallen ingesteld. NEGEER de fabrieksopgave voor deze specifieke taken en gebruik de waarde van de gebruiker:\n";
        car.customMaintenanceIntervals.forEach(ci => {
            intervalContext += `- ${ci.taskName}: elke ${ci.intervalKm} km\n`;
        });
    }

    const historyText = history
      .map(
        (h) =>
          `- ${h.date}: ${h.title} (${h.description}) bij ${h.mileageAtService} km`
      )
      .join("\n");

    const prompt = `
      Ik heb een auto: ${car.make} ${car.model} uit ${car.year} met brandstoftype ${car.fuelType}.
      De huidige kilometerstand is ${car.mileage} km.
      
      ${intervalContext}
      
      Dit is de onderhoudshistorie die bekend is:
      ${historyText ? historyText : "Geen historie bekend."}

      Jij bent een expert automonteur. Analyseer de auto en de historie.
      
      Je doel is om een 'monitor' te maken voor de gebruiker. 
      1. Kijk naar wat er gerepareerd is en bereken wanneer dit WEER moet gebeuren (bijv. olie elke 15k-30k km).
      2. Kijk naar wat er nog niet gedaan is maar wel moet gebeuren gezien de leeftijd/km-stand.
      
      Genereer een lijst met concrete onderhoudsadviezen of toekomstige checks.
      
      BELANGRIJK: Voor minder kritieke zaken of zaken die je makkelijk zelf kunt checken (zoals Airco, Ruitenwissers, Bandenprofiel, Verlichting), voeg een 'diyTip' toe.
      Voorbeeld diyTip Airco: "Zet de airco op koudste stand en houd een thermometer in het rooster. Deze moet onder de 8°C komen."
      
      Geef antwoord in het Nederlands.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: {
                type: Type.STRING,
                description: "Korte titel van de taak, bijv. 'Olie Verversen'",
              },
              urgency: {
                type: Type.STRING,
                enum: ["high", "medium", "low"],
                description: "Urgentie. High = nu/zsm, Medium = binnenkort, Low = toekomstig/in de gaten houden",
              },
              reason: {
                type: Type.STRING,
                description: "Uitleg waarom dit nodig is (bijv: 'Laatste keer was 30.000km geleden')",
              },
              estimatedCostRange: {
                type: Type.STRING,
                description: "Schatting kosten, bijv. '€100 - €150'",
              },
              dueMileage: {
                type: Type.NUMBER,
                description: "Bij welke totale km-stand dit ongeveer moet gebeuren. Als het nu moet, vul de huidige stand in.",
              },
              intervalKm: {
                type: Type.NUMBER,
                description: "Het gebruikelijke interval in km voor deze taak (bijv. 30000 voor olie). Gebruik 0 als het een eenmalige reparatie is.",
              },
              diyTip: {
                type: Type.STRING,
                description: "Een slimme, korte tip hoe de gebruiker dit zelf kan controleren of testen (indien van toepassing).",
              }
            },
            required: ["task", "urgency", "reason"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    return JSON.parse(jsonText) as MaintenanceSuggestion[];
  } catch (error: any) {
    console.error("Fout bij ophalen advies (Gemini):", error);
    if (error.message?.includes('403') || error.status === 403) {
        console.error(`TIP: Toegang geweigerd door Google (403). Controleer of "${window.location.origin}" is toegevoegd aan de API Key restricties in Google AI Studio.`);
    }
    return [];
  }
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 string
}

export const chatWithMechanic = async (
  message: string,
  image: string | undefined,
  chatHistory: ChatMessage[],
  contextData: { cars: Car[]; activeCarId: string | null; logs: MaintenanceRecord[] }
): Promise<string> => {
  if (!apiKey) {
      return "Configuratie fout: API Key ontbreekt in de applicatie.";
  }

  try {
    // Construct context string
    let systemContext = "Je bent Tuutuut Assistent, een behulpzame, deskundige AI automonteur. Je helpt de gebruiker met vragen over hun auto's en onderhoud.\n";
    
    if (contextData.cars.length > 0) {
      systemContext += "\nDe gebruiker heeft de volgende auto's:\n";
      contextData.cars.forEach(c => {
        systemContext += `- ${c.make} ${c.model} (${c.year}), ${c.fuelType}, ${c.mileage}km (Kenteken: ${c.licensePlate})\n`;
        
        // Add custom intervals context if present
        if (c.customMaintenanceIntervals && c.customMaintenanceIntervals.length > 0) {
            systemContext += `  Let op: Gebruiker hanteert eigen intervallen: ${c.customMaintenanceIntervals.map(i => `${i.taskName} elke ${i.intervalKm}km`).join(', ')}\n`;
        }
      });

      // Filter logs for active car or all logs
      const relevantLogs = contextData.activeCarId 
        ? contextData.logs.filter(l => l.carId === contextData.activeCarId)
        : contextData.logs;

      if (contextData.activeCarId) {
        const activeCar = contextData.cars.find(c => c.id === contextData.activeCarId);
        if (activeCar) {
            systemContext += `\nDe gebruiker kijkt NU naar de details van: ${activeCar.make} ${activeCar.model}.\n`;
        }
      }

      if (relevantLogs.length > 0) {
        systemContext += "\nDit is het relevante onderhoudslogboek:\n";
        relevantLogs.forEach(l => {
             // Find car name if looking at global list
             const carName = !contextData.activeCarId ? contextData.cars.find(c => c.id === l.carId)?.model : '';
             systemContext += `- ${l.date} ${carName}: ${l.title} (${l.description}) bij ${l.mileageAtService}km\n`;
        });
      }
    } else {
      systemContext += "\nDe gebruiker heeft nog geen auto's toegevoegd.\n";
    }

    systemContext += "\nAntwoord kort, bondig en hulpvaardig. Als de gebruiker een foto stuurt (bijvoorbeeld van een dashboardlampje), analyseer deze dan en geef advies.";

    // Convert history to Gemini format
    const contents = [
      { role: 'user', parts: [{ text: systemContext }] }, // System instruction as first user message for context
      ...chatHistory.map(msg => {
         const parts: any[] = [{ text: msg.text }];
         
         if (msg.image) {
            try {
                // Extract base64 data and mime type
                // Expected format: data:image/png;base64,.....
                const matches = msg.image.match(/^data:(.+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    parts.push({ 
                        inlineData: { 
                            mimeType: matches[1], 
                            data: matches[2] 
                        } 
                    });
                }
            } catch (e) {
                console.error("Error parsing image in history", e);
            }
         }
         
         return {
            role: msg.role,
            parts: parts
         };
      }),
      { 
        role: 'user', 
        parts: [] as any[]
      }
    ];

    // Add current message parts
    const currentMessageParts = contents[contents.length - 1].parts;
    currentMessageParts.push({ text: message });
    
    if (image) {
        try {
            const matches = image.match(/^data:(.+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                currentMessageParts.push({ 
                    inlineData: { 
                        mimeType: matches[1], 
                        data: matches[2] 
                    } 
                });
            }
        } catch (e) {
            console.error("Error parsing current image", e);
        }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    return response.text || "Sorry, ik begreep dat niet helemaal.";
  } catch (error: any) {
    console.error("Chat error:", error);
    if (error.message?.includes('403') || error.status === 403) {
        return `Fout: Toegang geweigerd (403). Het domein "${window.location.hostname}" is niet toegestaan in je Google AI Studio API Key instellingen. Voeg "${window.location.origin}/*" toe aan de 'Website restrictions'.`;
    }
    return "Er is een fout opgetreden bij het verbinden met de AI monteur. Controleer of je API Key geldig is.";
  }
};