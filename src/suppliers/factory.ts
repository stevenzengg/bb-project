import { SupplierParser } from "./parser.interface";
import { TTIParser } from "./parsers/tti.parser";
import { ArrowParser } from "./parsers/arrow.parser";

export class SupplierParserFactory {
  private static parsers: { [key: string]: SupplierParser } = {
    "TTI": new TTIParser(),
    "Arrow": new ArrowParser(),
  };

  static getParser(supplier: string): SupplierParser | null {
    return this.parsers[supplier] || null;
  }

  static registerParser(supplier: string, parser: SupplierParser): void {
    this.parsers[supplier] = parser;
  }
}