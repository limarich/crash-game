import { Module } from '@nestjs/common';
import { ProvablyFairService } from './provably-fair.service';

@Module({
  providers: [ProvablyFairService],
  exports: [ProvablyFairService]
})
export class ProvablyFairModule { }
