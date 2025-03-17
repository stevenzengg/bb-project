import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { SupplierParserFactory } from '../suppliers/factory';

@Injectable()
export class PartsService {
    private readonly suppliers = [
        { name: 'Arrow', url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/myarrow.json' },
        { name: 'TTI', url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/tti.json' },
    ];

    async getAggregatedPart(partNumber: string) {
        // Step 1: Fetch data from all suppliers
        const supplierData = await Promise.all(
            this.suppliers.map(async (supplier) => {
                try {
                    const response = await axios.get(supplier.url);
                    return { supplier: supplier.name, data: response.data };
                } catch (error) {
                    console.error(`Error fetching data from ${supplier.name}:`, error.message);
                    return null; // If API fails, we skip it
                }
            }),
        );

        // Step 2: Remove failed supplier responses
        const successfulSuppliers = supplierData.filter((item) => item?.data);

        // Step 3: If ALL suppliers failed, return an error
        if (successfulSuppliers.length === 0) {
            throw new HttpException(
                "All supplier APIs failed. Please try again later.",
                HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        // Step 4: Extract parts and inject origin
        const parts = successfulSuppliers.flatMap((supplier) => {
            if (!supplier?.supplier) return [];

            console.log("Checking part supplier:", supplier);
            const parser = SupplierParserFactory.getParser(supplier.supplier);
            if (!parser) {
                console.warn(`No parser found for supplier: ${supplier.supplier}`);
                return [];
            }
            return parser.extractParts(supplier.data, partNumber).map((part) => ({
                ...part,
                origin: supplier.supplier, // 🔹 Track where the data came from
            }));
        });

        // Step 5: If no matching data found, return a 404
        if (parts.length === 0) {
            throw new HttpException(`Part ${partNumber} not found from any suppliers`, HttpStatus.NOT_FOUND);
        }

        // Step 6: Aggregate data and return response
        return this.aggregateData(parts, partNumber);
    }

    private aggregateData(parts: any[], partNumber: string) {
        const totalStock = parts.reduce((sum, part) => sum + (Number(part.fohQuantity) || Number(part.availableToSell) || 0), 0);
        const manufacturerLeadTime = Math.min(...parts.map(part => this.convertLeadTime(part) ?? 9999));
        const specifications = this.groupSpecificationsBySupplier(parts);
        const packaging = this.extractPackagingFromParts(parts);

        return {
            name: partNumber,            
            description: parts.find(part => part.description)?.description || "No description available",
            totalStock,
            manufacturerLeadTime: manufacturerLeadTime === 9999 ? "N/A" : `${manufacturerLeadTime} days`,
            manufacturerName: parts.find(part => part.manufacturer)?.manufacturer || "Unknown",
            productDoc: parts.find(part => part.datasheetURL)?.datasheetURL || null,
            productUrl: parts.find(part => part.buyUrl)?.buyUrl || null,
            productImageUrl: parts.find(part => part.imageURL)?.imageURL || null,
            sourceParts: [...new Set(parts.map(part => part.origin).filter(Boolean))], // Remove nulls
            specifications,
            packaging,
        };
    }

    private convertLeadTime(part: any): number | null {
        if (!part.leadTime) return null;
        if (typeof part.leadTime === 'string') {
            const match = part.leadTime.match(/(\d+)\s*weeks?/i);
            return match ? parseInt(match[1]) * 7 : null; // Convert weeks to days
        }
        return typeof part.leadTime === 'number' ? part.leadTime * 7 : null; // Convert weeks to days
    }

    private groupSpecificationsBySupplier(parts: any[]): any {
        return parts.reduce((acc, part) => {
            if (!part.origin) {
                console.warn("⚠️ Missing origin for part:", part);
                return acc;
            }
    
            const parser = SupplierParserFactory.getParser(part.origin);
            if (!parser) {
                console.warn(`⚠️ No parser found for origin: ${part.origin}`);
                return acc;
            }
    
            console.log("✅ Calling extractSpecifications() for origin:", part.origin);
            const specData = parser.extractSpecifications(part);
    
            // Ensure correct structure (only add if valid)
            if (specData && specData.supplier && Array.isArray(specData.specifications)) {
                if (!acc[specData.supplier]) {
                    acc[specData.supplier] = [];
                }
                acc[specData.supplier] = specData.specifications;
            } else {
                console.warn(`⚠️ extractSpecifications did not return a valid object for origin: ${part.origin}`);
            }
    
            return acc;
        }, {});
    }
    
    

    private extractPackagingFromParts(parts: any[]) {
        return parts.flatMap((part) => {
            if (!part.origin) {
                console.warn("⚠️ Missing origin for part:", part);
                return [];
            }

            const parser = SupplierParserFactory.getParser(part.origin);
            if (!parser) {
                console.warn(`⚠️ No parser found for origin: ${part.origin}`);
                return [];
            }

            return parser.extractPackaging(part);
        });
    }
}
