import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateJobDescription(title: string, requirements: string): Promise<string> {
  const prompt = `
    You are an expert HR manager in the textile and knitting industry.
    Create a professional job description for a ${title}.
    Requirements: ${requirements}
    
    Use O*NET standard terminology (e.g., SOC 51-6062.00: Textile Knitting and Weaving Machine Setters, Operators, and Tenders).
    Include sections for:
    - Job Summary
    - Key Responsibilities
    - Required Skills & Qualifications (especially machine types like Stoll, Shima Seiki, and gauge experience)
    - Benefits (mention visa sponsorship if applicable)
    
    Format the output in Markdown.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
  });

  return response.text || '';
}

export async function chatWithWorker(history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string): Promise<string> {
  const systemInstruction = `
    You are a friendly, empathetic assistant helping a Bangladeshi textile worker create their professional profile.
    The worker might not be highly educated, so use simple, clear Bengali (Bangla). Be very encouraging.
    Your goal is to gather:
    1. Years of experience.
    2. Specific knitting machines they can operate (e.g., Stoll, Shima Seiki, gauge sizes).
    3. General skills (e.g., programming, maintenance, intarsia).
    4. Current or past factory names.

    Ask one question at a time. Keep it conversational.
    If the user speaks in English, you can reply in English, but default to Bangla.
    Once you have gathered all the necessary information, reply with exactly: 'PROFILE_COMPLETE'.
  `;

  const contents = [...history, { role: 'user', parts: [{ text: newMessage }] }];

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: contents as any,
    config: {
      systemInstruction,
    },
  });

  return response.text || '';
}

export async function extractSkillsFromChat(chatHistory: string): Promise<{ skills: string[], machines: string[], experienceYears: number, currentFactory: string }> {
  const prompt = `
    Extract the following information from the worker's chat history. Translate all findings to English.
    1. A list of general skills (e.g., Intarsia, Jacquard, Maintenance, Programming).
    2. A list of specific machine models they can operate (e.g., Stoll ADF 530, Shima Seiki WHOLEGARMENT).
    3. Total years of experience (as a number).
    4. Current or past factory name (if mentioned).
    
    Chat History:
    "${chatHistory}"
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of general skills in English"
          },
          machines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of specific machine models in English"
          },
          experienceYears: {
            type: Type.NUMBER,
            description: "Total years of experience"
          },
          currentFactory: {
            type: Type.STRING,
            description: "Name of the factory they work at or worked at"
          }
        },
        required: ["skills", "machines", "experienceYears", "currentFactory"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { skills: [], machines: [], experienceYears: 0, currentFactory: '' };
  }
}

export async function translateJobToBengali(job: any): Promise<{ title: string, description: string, requirements: string[] }> {
  const prompt = `
    You are an expert translator. Translate the following job posting details from English to Bengali (Bangla).
    Ensure the translation is natural and easily understood by a Bangladeshi textile worker.

    Job Title: ${job.title}
    Job Description: ${job.description}
    Requirements (Machine/Skills): ${job.machineRequirements?.join(', ') || 'None'}

    Return the result as a JSON object with the following structure:
    {
      "title": "Bengali translation of title",
      "description": "Bengali translation of description",
      "requirements": ["Bengali translation of req 1", "Bengali translation of req 2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to translate job", error);
    return { title: '', description: '', requirements: [] };
  }
}

export async function extractTextFromCVFile(base64Data: string, mimeType: string): Promise<string> {
  const prompt = `
    You are an expert translator and HR assistant.
    Extract all the text from this CV document.
    If the document is in Bengali (Bangla) or any other language, translate it completely and accurately into professional English.
    If it is already in English, just extract the text and format it nicely.
    Return ONLY the translated/extracted professional English text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || '';
  } catch (error) {
    console.error("Failed to extract text from CV file", error);
    return '';
  }
}

export async function extractSkillsFromCV(cvText: string): Promise<{ skills: string[], machines: string[], experienceYears: number }> {
  const prompt = `
    Extract the following information from the worker's description. Translate to English if it is in Bengali.
    1. A list of general skills (e.g., Intarsia, Jacquard, Maintenance, Programming).
    2. A list of specific machine models they can operate (e.g., Stoll ADF 530, Shima Seiki WHOLEGARMENT).
    3. Total years of experience (as a number).
    
    Worker's description:
    "${cvText}"
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of general skills in English"
          },
          machines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of specific machine models in English"
          },
          experienceYears: {
            type: Type.NUMBER,
            description: "Total years of experience"
          }
        },
        required: ["skills", "machines", "experienceYears"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { skills: [], machines: [], experienceYears: 0 };
  }
}

export async function scoreCandidate(jobDescription: string, candidateProfile: any): Promise<{ score: number, reasoning: string }> {
  const prompt = `
    You are an AI matching engine for a labor arbitrage platform.
    Score the candidate's fit for the job on a scale of 0 to 100.
    
    Job Description:
    ${jobDescription}
    
    Candidate Profile:
    Skills: ${candidateProfile.skills?.join(', ')}
    Machines: ${candidateProfile.machineExpertise?.join(', ')}
    Experience: ${candidateProfile.experienceYears} years
    
    Provide a score and a brief reasoning (max 2 sentences).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Match score from 0 to 100" },
          reasoning: { type: Type.STRING, description: "Brief reasoning for the score" }
        },
        required: ["score", "reasoning"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { score: 0, reasoning: "Failed to generate score." };
  }
}
