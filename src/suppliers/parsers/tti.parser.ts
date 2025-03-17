import { SupplierParser } from "../parser.interface";

export class TTIParser implements SupplierParser {
  extractParts(data: any, partNumber: string): any[] {
    if (!data.parts) return [];
    return data.parts.filter((part: any) => part.manufacturerPartNumber === partNumber);
  }

  extractPackaging(part: any): any[] {
    if (!part.packaging) return [];

    const leadTimeMatch = part.leadTime?.match(/\d+/);
    const leadTimeDays = leadTimeMatch ? `${parseInt(leadTimeMatch[0]) * 7}` : "N/A";

    return [{
      type: part.packaging || "Unspecified",
      minimumOrderQuantity: part.salesMinimum || 1,
      quantityAvailable: part.availableToSell || 0,
      unitPrice: parseFloat(part.pricing?.vipPrice) || 0,
      supplier: "TTI",
      priceBreaks: part.pricing?.quantityPriceBreaks
        ? part.pricing.quantityPriceBreaks.map((tier) => ({
            breakQuantity: tier.quantity,
            unitPrice: parseFloat(tier.price),
            totalPrice: tier.quantity * parseFloat(tier.price),
        }))
        : [],
      manufacturerLeadTime: leadTimeDays,
    }];
  }

  extractSpecifications(part: any): any {
    return {
        supplier: "TTI",
        specifications: [
            { key: "Category", value: part.category || "N/A" },
            { key: "HTS Code", value: part.hts || "N/A" },
            { key: "RoHS Status", value: part.roHsStatus || "N/A" },
            { key: "Lead in Terminals", value: part.environmentalInformation?.leadInTerminals || "N/A" },
            { key: "REACH SVHC", value: part.environmentalInformation?.reachSVHC || "N/A" },
            { key: "REACH Substance Name", value: part.environmentalInformation?.reachSubstanceName || "N/A" }
        ]
    };
  }

}
