import { Module } from '@nestjs/common';
import { PartsController } from './parts/parts.controller';
import { PartsService } from './parts/parts.service';
import { PartsModule } from './parts/parts.module';
import { SupplierParserFactory } from './suppliers/factory';
import { TTIParser } from './suppliers/parsers/tti.parser';
import { ArrowParser } from './suppliers/parsers/arrow.parser';

@Module({
  controllers: [PartsController], // Keep only PartsController
  providers: [PartsService], // Keep only PartsService
})

@Module({
  imports: [PartsModule],
})
export class AppModule {
  constructor() {
    // 🔹 Register Supplier Parsers at Startup
    SupplierParserFactory.registerParser("TTI", new TTIParser());
    SupplierParserFactory.registerParser("Arrow", new ArrowParser());
  }
}