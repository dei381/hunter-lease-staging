import { GoogleGenAI, Type } from "@google/genai";
import { FinancialData } from '../types/engine';

export class ExtractionEngine {
  static async extract(fileBuffer: Buffer, mimeType: string, customApiKey?: string): Promise<FinancialData> {
    // Use the custom API key if provided, otherwise fallback to environment variables
    const apiKey = customApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing. Please configure it in the Admin Settings.");
    }
    const ai = new GoogleGenAI({ apiKey: apiKey as string });
    
    const base64Data = fileBuffer.toString("base64");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          },
          {
            text: `You are an expert automotive finance AI. Extract the financial data from this car dealer quote or lease worksheet.
            
            For each field, provide:
            1. value: The numeric value extracted (use 0 if not found).
            2. provenance_status: "extracted_from_document" if you found it, or "unresolved" if you couldn't find it.
            3. disclosure_required: true if this is a fee or tax that needs disclosure, false otherwise.
            
            Fields to extract:
            - make: The car brand (e.g., Toyota, BMW). Return as a string.
            - model: The car model (e.g., RAV4, X5). Return as a string.
            - trim: The car trim (e.g., LE, xDrive40i). Return as a string.
            - msrp: Total MSRP or Retail Price
            - salePrice: Selling Price or Agreed Upon Value
            - residualValue: Residual Value (usually a large number, e.g., 30000, not the percentage. If only percentage is found, calculate it from MSRP if possible, otherwise 0)
            - moneyFactor: Money Factor (e.g., 0.00210). If rent charge is given instead, try to extract MF if visible, else 0.
            - term: Lease term in months (e.g., 36)
            - docFee: Dealer Document Fee
            - dmvFee: DMV / Registration / License Fees
            - taxMonthly: Monthly Tax amount or Tax Rate (if rate, convert to decimal, e.g., 9.5% -> 0.095).
            - monthlyPayment: The final monthly payment including tax.
            - acquisitionFee: Bank Acquisition Fee (usually $595-$1095).
            - rebates: Total Rebates or Incentives applied.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            make: { type: Type.STRING },
            model: { type: Type.STRING },
            trim: { type: Type.STRING },
            msrp: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            salePrice: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            residualValue: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            moneyFactor: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            term: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            docFee: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            dmvFee: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            taxMonthly: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            monthlyPayment: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            acquisitionFee: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
            rebates: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, provenance_status: { type: Type.STRING }, disclosure_required: { type: Type.BOOLEAN } } },
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    return JSON.parse(text) as FinancialData;
  }
}
