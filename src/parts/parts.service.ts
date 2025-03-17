import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { SupplierParserRegistry } from '../suppliers/supplier.registry';

@Injectable()
export class PartsService {
    private readonly suppliers = [
        { name: 'Arrow', url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/myarrow.json' },
        { name: 'TTI', url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/tti.json' },
    ];

    async getAggregatedPart(partNumber: string) {
        const supplierData = await this.fetchSupplierData();
        if (supplierData.length === 0) {
            throw new HttpException("All supplier APIs failed. Please try again later.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        const parts = this.extractParts(supplierData, partNumber);
        if (parts.length === 0) {
            throw new HttpException(`Part ${partNumber} not found from any suppliers`, HttpStatus.NOT_FOUND);
        }

        return this.aggregateData(parts, partNumber);
    }

    private async fetchSupplierData() {
        const responses = await Promise.allSettled(
            this.suppliers.map(supplier =>
                axios.get(supplier.url).then(response => ({ supplier: supplier.name, data: response.data }))
            )
        );

        return responses
            .filter(res => res.status === "fulfilled" && res.value?.data)
            .map(res => (res as PromiseFulfilledResult<any>).value);
    }

    private extractParts(supplierData: any[], partNumber: string) {
        return supplierData.flatMap(({ supplier, data }) => {
            const parser = this.getParserOrWarn(supplier);
            return parser ? parser.extractParts(data, partNumber).map(part => ({ ...part, origin: supplier })) : [];
        });
    }

    private aggregateData(parts: any[], partNumber: string) {
        // Extract packaging data once
        const packaging = this.extractPackagingFromParts(parts);
    
        // Get minimum lead time from extracted packaging data
        const manufacturerLeadTime = this.getMinLeadTimeFromPackaging(packaging);
    
        return {
            name: partNumber,
            description: parts.find(part => part.description)?.description || "No description available",
            totalStock: parts.reduce((sum, part) => sum + (Number(part.fohQuantity) || Number(part.availableToSell) || 0), 0),
            manufacturerLeadTime,
            manufacturerName: parts.find(part => part.manufacturer)?.manufacturer || "Unknown",
            productDoc: parts.find(part => part.datasheetURL)?.datasheetURL || null,
            productUrl: parts.find(part => part.buyUrl)?.buyUrl || null,
            productImageUrl: parts.find(part => part.imageURL)?.imageURL || null,
            sourceParts: [...new Set(parts.map(part => part.origin).filter(Boolean))],
            specifications: this.groupSpecificationsBySupplier(parts),
            packaging, // Already extracted earlier
        };
    }
    
    // Extract minimum lead time from packaging
    private getMinLeadTimeFromPackaging(packaging: any[]): string {
        const leadTimes = packaging
            .map(p => parseInt(p.manufacturerLeadTime))
            .filter(time => !isNaN(time));
    
        return leadTimes.length > 0 ? `${Math.min(...leadTimes)}` : "N/A";
    }
    
    private convertLeadTime(part: any): number | null {
        if (typeof part.leadTime === 'string') {
            const match = part.leadTime.match(/(\d+)\s*weeks?/i);
            return match ? parseInt(match[1]) * 7 : null;
        }
        return typeof part.leadTime === 'number' ? part.leadTime * 7 : null;
    }

    private groupSpecificationsBySupplier(parts: any[]) {
        return parts.reduce((acc, part) => {
            const parser = this.getParserOrWarn(part.origin);
            if (!parser) return acc;

            const specData = parser.extractSpecifications(part);
            if (specData?.supplier && Array.isArray(specData.specifications)) {
                acc[specData.supplier] = specData.specifications;
            }
            return acc;
        }, {});
    }

    private extractPackagingFromParts(parts: any[]) {
        return parts.flatMap(part => {
            const parser = this.getParserOrWarn(part.origin);
            return parser ? parser.extractPackaging(part) : [];
        });
    }

    private getParserOrWarn(supplier: string) {
        const parser = SupplierParserRegistry.getParser(supplier);
        if (!parser) console.warn(`⚠️ No parser found for supplier: ${supplier}`);
        return parser;
    }
}
