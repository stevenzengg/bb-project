import { Controller, Get, Query } from '@nestjs/common';
import { PartsService } from './parts.service';

@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  async getPart(@Query('partNumber') partNumber: string) {
    return this.partsService.getAggregatedPart(partNumber);
  }
}
