export interface SupplierParser {
    extractParts(data: any, partNumber: string): any[];
    extractPackaging(part: any): any[]; // 🔹 New method
    extractSpecifications(part: any): any; // 🔹 New method
  }
  