import { Module } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';

@Module({
  providers: [PartsService], // Services available inside this module
  controllers: [PartsController], // Controllers for handling HTTP requests
  exports: [PartsService], // Allow other modules to use PartsService
})
export class PartsModule {}