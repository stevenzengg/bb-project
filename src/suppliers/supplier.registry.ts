import { SupplierParser } from "./parser.interface";
export class SupplierParserRegistry {
    private static parsers: Map<string, SupplierParser> = new Map();

    static register(supplierName: string, parser: SupplierParser) {
        this.parsers.set(supplierName, parser);
    }

    static getParser(supplierName: string): SupplierParser | null {
        return this.parsers.get(supplierName) || null;
    }
    static getParsers() {
        return Array.from(this.parsers.keys());
    }
}