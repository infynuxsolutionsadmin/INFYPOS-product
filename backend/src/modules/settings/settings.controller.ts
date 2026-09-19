import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  @Permissions('settings.read')
  @Get('vat')
  getVatSettings() {
    return [
      { code: 'STANDARD', name: 'Standard', rate: 20 },
      { code: 'REDUCED', name: 'Reduced', rate: 5 },
      { code: 'ZERO', name: 'Zero', rate: 0 },
    ];
  }
}
