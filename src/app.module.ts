import { PartsController } from './parts/parts.controller';
import { PartsService } from './parts/parts.service';
import { PartsModule } from './parts/parts.module';
import { Module, OnModuleInit } from '@nestjs/common';
import { SupplierParserRegistry } from './suppliers/supplier.registry';
import { ArrowParser } from './suppliers/parsers/arrow.parser';
import { TTIParser } from './suppliers/parsers/tti.parser';

@Module({
  controllers: [PartsController], // Keep only PartsController
  providers: [PartsService], // Keep only PartsService
})

@Module({
  imports: [PartsModule],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    console.log("✅ Registering supplier parsers...");
    SupplierParserRegistry.register("Arrow", new ArrowParser());
    SupplierParserRegistry.register("TTI", new TTIParser());
    console.log("✅ Registered Parsers:", SupplierParserRegistry.getParsers());
  }
}