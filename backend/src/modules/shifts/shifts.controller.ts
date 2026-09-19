import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('shifts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @Permissions('shifts.open')
  async openShift(@Req() req, @Body() dto: OpenShiftDto) {
    const shift = await this.shiftsService.openShift(req.user.tenantId, req.user.storeId, req.user.userId, dto);
    return {
      success: true,
      statusCode: 201,
      timestamp: new Date().toISOString(),
      data: shift,
    };
  }

  @Get(':id/x-report')
  @Permissions('shifts.xreport')
  async getXReport(@Req() req, @Param('id') shiftId: string) {
    const report = await this.shiftsService.getXReport(req.user.tenantId, req.user.storeId, shiftId);
    return {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: report,
    };
  }

  @Post(':id/close')
  @Permissions('shifts.close')
  async closeShift(@Req() req, @Param('id') shiftId: string, @Body() dto: CloseShiftDto) {
    const shift = await this.shiftsService.closeShift(req.user.tenantId, req.user.storeId, req.user.userId, shiftId, dto);
    return {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: shift,
    };
  }

  @Get(':id/z-report')
  @Permissions('shifts.zreport')
  async getZReport(@Req() req, @Param('id') shiftId: string) {
    const report = await this.shiftsService.getZReport(req.user.tenantId, req.user.storeId, shiftId);
    return {
      success: true,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      data: report,
    };
  }
}
