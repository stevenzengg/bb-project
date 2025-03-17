import { SupplierParser } from "../parser.interface";
import { SupplierParserRegistry } from "../supplier.registry";

export class ArrowParser implements SupplierParser {
  constructor() {
    SupplierParserRegistry.register("Arrow", this);
}
  extractParts(data: any, partNumber: string): any[] {
    if (!data.pricingResponse) return [];
    return data.pricingResponse.filter((part: any) => part.partNumber === partNumber);
  }

  extractPackaging(part: any): any[] {
    console.log("🔍 Extracting packaging for:", part.partNumber, "| Origin:", part.origin);
    
    const hasPricing = part.pricingTier && part.pricingTier.length > 0;
    const unitPrice = hasPricing ? parseFloat(part.pricingTier[0]?.resalePrice) : parseFloat(part.resalePrice) || 0;
    
    return [{
        type: part.pkg || "Unspecified",
        minimumOrderQuantity: part.minOrderQuantity || 1,
        quantityAvailable: parseInt(part.fohQuantity) || 0,
        unitPrice,
        supplier: "Arrow",
        priceBreaks: hasPricing 
            ? part.pricingTier.map((tier) => ({
                breakQuantity: parseInt(tier.minQuantity),
                unitPrice: parseFloat(tier.resalePrice),
                totalPrice: parseInt(tier.minQuantity) * parseFloat(tier.resalePrice),
            })) 
            : [],
        manufacturerLeadTime: part.leadTime?.supplierLeadTime ? `${part.leadTime.supplierLeadTime * 7}` : "N/A",
        warehouseId: part.warehouseId || null,
        }];
    }

    // Unchecked, needs to be updated
    extractSpecifications(part: any): any {
        return {
            supplier: "Arrow",
            specifications: [
                { key: "Category", value: part.taxonomy || "N/A" },
                { key: "HTS Code", value: part.htsCode || "N/A" },
                { key: "Part Classification", value: part.partClassification || "N/A" },
                { key: "EU RoHS", value: part.euRohs || "N/A" },
                { key: "China RoHS", value: part.chinaRohs || "N/A" },
                { key: "SVHC Over Threshold", value: part.SVHC?.svhcOverThreshold || "N/A" }
            ]
        };
    }
}
new ArrowParser(); // 🔹 Ensures the parser registers itself on import

