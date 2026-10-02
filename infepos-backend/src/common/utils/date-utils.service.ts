import { Injectable } from '@nestjs/common';

@Injectable()
export class DateUtilsService {
  normalizeDateRange(fromDate?: string, toDate?: string) {
    let start: Date;
    let end: Date;

    const now = new Date();

    if (fromDate) {
      start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    }

    if (toDate) {
      end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    // Validate
    if (start.getTime() > end.getTime()) {
      // fallback to today if invalid
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }
}
