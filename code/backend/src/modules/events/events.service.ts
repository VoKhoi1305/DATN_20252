import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import { Event } from './entities/event.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { AreasService } from '../areas/areas.service';
import { ListEventsDto } from './dto/list-events.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly areasService: AreasService,
  ) {}

  async list(userId: string, query: ListEventsDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      return { data: [], total: 0, page: query.page, limit: query.limit };
    }

    const areaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.subject', 's');

    // Scope filtering by area
    if (areaIds !== null) {
      if (areaIds.length === 0) {
        return { data: [], total: 0, page: query.page, limit: query.limit };
      }
      qb.andWhere('s.areaId IN (:...areaIds)', { areaIds });
    }

    // Filters
    if (query.subject_id) {
      qb.andWhere('e.subjectId = :subjectId', { subjectId: query.subject_id });
    }

    if (query.type) {
      qb.andWhere('e.type = :type', { type: query.type });
    }

    if (query.result) {
      qb.andWhere('e.result = :result', { result: query.result });
    }

    if (query.from) {
      qb.andWhere('e.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('e.createdAt <= :to', { to: query.to });
    }

    // Sorting
    const allowedSortColumns: Record<string, string> = {
      created_at: 'e.createdAt',
      client_timestamp: 'e.clientTimestamp',
      type: 'e.type',
      result: 'e.result',
      code: 'e.code',
    };
    const sortColumn = allowedSortColumns[query.sort] || 'e.createdAt';
    const sortOrder = query.order.toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortColumn, sortOrder);

    // Pagination
    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    const [events, total] = await qb.getManyAndCount();

    const data = events.map((e) => ({
      id: e.id,
      code: e.code,
      type: e.type,
      result: e.result,
      created_at: e.createdAt,
      client_timestamp: e.clientTimestamp,
      gps_lat: e.gpsLat,
      gps_lng: e.gpsLng,
      in_geofence: e.inGeofence,
      face_match_score: e.faceMatchScore,
      nfc_verified: e.nfcVerified,
      subject: e.subject
        ? {
            id: e.subject.id,
            code: e.subject.code,
            full_name: e.subject.fullName,
          }
        : null,
    }));

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const event = await this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.subject', 's')
      .where('e.id = :id', { id })
      .getOne();

    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }

    return {
      id: event.id,
      code: event.code,
      type: event.type,
      result: event.result,
      subject_id: event.subjectId,
      scenario_id: event.scenarioId,
      gps_lat: event.gpsLat,
      gps_lng: event.gpsLng,
      gps_accuracy: event.gpsAccuracy,
      in_geofence: event.inGeofence,
      geofence_distance: event.geofenceDistance,
      face_match_score: event.faceMatchScore,
      nfc_verified: event.nfcVerified,
      nfc_cccd_match: event.nfcCccdMatch,
      liveness_score: event.livenessScore,
      face_image_url: event.faceImageUrl,
      device_id: event.deviceId,
      device_info: event.deviceInfo,
      is_voluntary: event.isVoluntary,
      extra_data: event.extraData,
      client_timestamp: event.clientTimestamp,
      created_by_id: event.createdById,
      created_at: event.createdAt,
      subject: event.subject
        ? {
            id: event.subject.id,
            code: event.subject.code,
            full_name: event.subject.fullName,
          }
        : null,
    };
  }

  async getRecent(userId: string, limit: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      return [];
    }

    const areaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.subject', 's');

    if (areaIds !== null) {
      if (areaIds.length === 0) {
        return [];
      }
      qb.andWhere('s.areaId IN (:...areaIds)', { areaIds });
    }

    qb.orderBy('e.createdAt', 'DESC').take(limit);

    const events = await qb.getMany();

    return events.map((e) => ({
      id: e.id,
      code: e.code,
      type: e.type,
      result: e.result,
      created_at: e.createdAt,
      client_timestamp: e.clientTimestamp,
      gps_lat: e.gpsLat,
      gps_lng: e.gpsLng,
      in_geofence: e.inGeofence,
      face_match_score: e.faceMatchScore,
      nfc_verified: e.nfcVerified,
      subject: e.subject
        ? {
            id: e.subject.id,
            code: e.subject.code,
            full_name: e.subject.fullName,
          }
        : null,
    }));
  }

  // =========================================================================
  // Trace: Search subject by CCCD and return all events with GPS data
  // =========================================================================

  async trace(cccd: string) {
    const cccdHash = createHash('sha256').update(cccd).digest('hex');

    const subject = await this.subjectRepo.findOne({
      where: { cccdHash },
      select: ['id', 'code', 'fullName', 'cccdEncrypted', 'address', 'phone'],
    });

    if (!subject) {
      throw new NotFoundException('Không tìm thấy đối tượng với số CCCD này.');
    }

    const events = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.subjectId = :subjectId', { subjectId: subject.id })
      .orderBy('e.createdAt', 'DESC')
      .getMany();

    return {
      subject: {
        id: subject.id,
        code: subject.code,
        full_name: subject.fullName,
        cccd: cccd,
        address: subject.address,
        phone: subject.phone,
      },
      events: events.map((e) => ({
        id: e.id,
        code: e.code,
        type: e.type,
        result: e.result,
        gps_lat: e.gpsLat,
        gps_lng: e.gpsLng,
        gps_accuracy: e.gpsAccuracy,
        in_geofence: e.inGeofence,
        geofence_distance: e.geofenceDistance,
        face_match_score: e.faceMatchScore,
        nfc_verified: e.nfcVerified,
        client_timestamp: e.clientTimestamp,
        created_at: e.createdAt,
      })),
    };
  }

  // =========================================================================
  // Export to Excel
  // =========================================================================

  async exportExcel(userId: string, query: ListEventsDto): Promise<Buffer> {
    const exportDto = { ...query, page: 1, limit: 5000 };
    const result = await this.list(userId, exportDto);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SMTTS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sự kiện');

    // Header row
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã sự kiện', key: 'code', width: 18 },
      { header: 'Loại', key: 'type', width: 22 },
      { header: 'Kết quả', key: 'result', width: 14 },
      { header: 'Đối tượng', key: 'subject', width: 28 },
      { header: 'GPS', key: 'gps', width: 28 },
      { header: 'Trong vùng', key: 'in_geofence', width: 14 },
      { header: 'Thời gian', key: 'created_at', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9B1C1C' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    const TYPE_LABEL: Record<string, string> = {
      CHECKIN: 'Điểm danh',
      CHECKIN_OVERDUE: 'Điểm danh quá hạn',
      FACE_MISMATCH: 'Khuôn mặt không khớp',
      NFC_MISMATCH: 'NFC không khớp',
      GEOFENCE_EXIT: 'Ra khỏi vùng',
      CURFEW_VIOLATION: 'Vi phạm giờ giới nghiêm',
      DEVICE_CHANGE: 'Thay đổi thiết bị',
    };

    const RESULT_LABEL: Record<string, string> = {
      SUCCESS: 'Thành công',
      FAILED: 'Thất bại',
      WARNING: 'Cảnh báo',
    };

    const formatDateTime = (iso: string | Date | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    result.data.forEach((row: any, i: number) => {
      const gps =
        row.gps_lat != null && row.gps_lng != null
          ? `${row.gps_lat}, ${row.gps_lng}`
          : '';
      const dataRow = sheet.addRow({
        stt: i + 1,
        code: row.code,
        type: TYPE_LABEL[row.type] ?? row.type,
        result: RESULT_LABEL[row.result] ?? row.result,
        subject: row.subject?.full_name ?? '',
        gps,
        in_geofence:
          row.in_geofence === true
            ? 'Có'
            : row.in_geofence === false
              ? 'Không'
              : '',
        created_at: formatDateTime(row.created_at),
      });
      dataRow.alignment = { vertical: 'middle' };
      if (i % 2 === 1) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' },
        };
      }
    });

    // Auto-filter on header row
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    // Freeze first row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
