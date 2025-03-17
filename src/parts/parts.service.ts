import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { SupplierParserRegistry } from '../suppliers/supplier.registry';

@Injectable()
export class PartsService {
    private readonly suppliers = [
        { name: 'Arrow', url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/myarrow.json' },
        { name: 'TTI', url: 'https://backend-takehome.s3.us-east-1.amazonaws.com/tti.json' },
    ];

    /**
     * Fetches and aggregates part data from multiple suppliers.
     */
    async getAggregatedPart(partNumber: string) {
        console.log(`Fetching data for part number: ${partNumber}`);

        try {
            const supplierData = await this.fetchSupplierData();
            if (!supplierData.length) {
                console.error(`All supplier APIs failed.`);
                throw new HttpException("All supplier APIs failed.", HttpStatus.SERVICE_UNAVAILABLE);
            }

            const parts = this.extractParts(supplierData, partNumber);
            if (!parts.length) {
                console.warn(`Part ${partNumber} not found from any suppliers.`);
                throw new HttpException(`Part ${partNumber} not found`, HttpStatus.NOT_FOUND);
            }

            console.log(`Successfully fetched and extracted ${parts.length} matching parts.`);
            return this.aggregateData(parts, partNumber);
        } catch (error) {
            console.error(`Unexpected error in getAggregatedPart:`, error);
            throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Fetches data from all suppliers, filtering out failed responses.
     */
    private async fetchSupplierData() {
        console.log("Fetching data from all suppliers...");

        try {
            const responses = await Promise.allSettled(
                this.suppliers.map(supplier =>
                    axios.get(supplier.url)
                        .then(response => ({ supplier: supplier.name, data: response.data }))
                        .catch(error => {
                            console.error(`Failed to fetch data from ${supplier.name}:`, error.message);
                            return null;
                        })
                )
            );

            const successfulResponses = responses
                .filter(res => res.status === "fulfilled" && res.value?.data)
                .map(res => (res as PromiseFulfilledResult<any>).value);

            console.log(`Successfully fetched data from ${successfulResponses.length} supplier(s).`);
            return successfulResponses;
        } catch (error) {
            console.error(`Error during supplier data fetch:`, error);
            throw new HttpException("Failed to fetch supplier data", HttpStatus.BAD_GATEWAY);
        }
    }

    /**
     * Extracts parts from supplier data and attaches their origin.
     */
    private extractParts(supplierData: any[], partNumber: string) {
        console.log(`Extracting parts matching part number: ${partNumber}...`);

        try {
            return supplierData.flatMap(({ supplier, data }) => {
                const parser = SupplierParserRegistry.getParser(supplier);
                if (!parser) {
                    console.warn(`⚠️ No parser found for supplier: ${supplier}`);
                    return [];
                }

                const extractedParts = parser.extractParts(data, partNumber).map(part => ({
                    ...part,
                    origin: supplier,
                }));

                console.log(`Extracted ${extractedParts.length} parts from ${supplier}.`);
                return extractedParts;
            });
        } catch (error) {
            console.error(`Error extracting parts for ${partNumber}:`, error);
            return [];
        }
    }

    /**
     * Aggregates extracted part data into a structured response.
     */
    private aggregateData(parts: any[], partNumber: string) {
        console.log(`Aggregating data for part number: ${partNumber}...`);

        try {
            const packaging = this.extractPackagingFromParts(parts);
            const manufacturerLeadTime = this.getMinLeadTimeFromPackaging(packaging);

            console.log(`Aggregation complete. Returning final data.`);
            return {
                name: partNumber,
                description: parts.find(p => p.description)?.description || "No description available",
                totalStock: parts.reduce((sum, p) => sum + (Number(p.fohQuantity) || Number(p.availableToSell) || 0), 0),
                manufacturerLeadTime,
                manufacturerName: parts.find(p => p.manufacturer)?.manufacturer || "Unknown",
                productDoc: parts.find(p => p.datasheetURL)?.datasheetURL || null,
                productUrl: parts.find(p => p.buyUrl)?.buyUrl || null,
                productImageUrl: parts.find(p => p.imageURL)?.imageURL || null,
                sourceParts: [...new Set(parts.map(p => p.origin))],
                specifications: this.groupSpecificationsBySupplier(parts),
                packaging,
            };
        } catch (error) {
            console.error(`Error during data aggregation:`, error);
            throw new HttpException("Data aggregation failed", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Extracts the minimum manufacturer lead time from the packaging data.
     */
    private getMinLeadTimeFromPackaging(packaging: any[]): string {
        try {
            const leadTimes = packaging
                .map(p => parseInt(p.manufacturerLeadTime))
                .filter(time => !isNaN(time));

            if (!leadTimes.length) {
                console.warn("No valid lead times found.");
                return "N/A";
            }

            const minLeadTime = Math.min(...leadTimes);
            console.log(`Minimum lead time determined: ${minLeadTime} days.`);
            return `${minLeadTime}`;
        } catch (error) {
            console.error(`Error calculating min lead time:`, error);
            return "N/A";
        }
    }

    /**
     * Groups specifications by supplier.
     */
    private groupSpecificationsBySupplier(parts: any[]) {
        console.log("Grouping specifications by supplier...");

        try {
            return parts.reduce((acc, part) => {
                const parser = SupplierParserRegistry.getParser(part.origin);
                if (!parser) {
                    console.warn(`No parser found for supplier: ${part.origin}`);
                    return acc;
                }

                const specData = parser.extractSpecifications(part);
                if (specData?.supplier && Array.isArray(specData.specifications)) {
                    acc[part.origin] = specData.specifications;
                }

                return acc;
            }, {} as Record<string, any[]>);
        } catch (error) {
            console.error(`Error grouping specifications:`, error);
            return {};
        }
    }

    /**
     * Extracts packaging details from all parts.
     */
    private extractPackagingFromParts(parts: any[]) {
        console.log("Extracting packaging details...");

        try {
            return parts.flatMap(part => {
                const parser = SupplierParserRegistry.getParser(part.origin);
                if (!parser) {
                    console.warn(`No parser found for supplier: ${part.origin}`);
                    return [];
                }

                return parser.extractPackaging(part);
            });
        } catch (error) {
            console.error(`Error extracting packaging:`, error);
            return [];
        }
    }
}
