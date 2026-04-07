import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Subject } from '../subjects/entities/subject.entity';

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List requests for a subject.
   */
  async listBySubject(subjectId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.dataSource.query(
        `SELECT r.id, r.type, r.reason, r.details, r.status,
                r.reviewed_by, u.full_name AS reviewed_by_name,
                r.reviewed_at, r.review_note,
                r.created_at, r.updated_at
         FROM requests r
         LEFT JOIN users u ON u.id = r.reviewed_by
         WHERE r.subject_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [subjectId, limit, offset],
      ),
      this.dataSource
        .query(
          `SELECT COUNT(*) FROM requests WHERE subject_id = $1`,
          [subjectId],
        )
        .then((r) => parseInt(r[0].count, 10)),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Create a new request from a subject.
   */
  async create(
    userId: string,
    data: { type: string; reason: string; details?: Record<string, any> },
  ) {
    const subject = await this.subjectRepo.findOne({
      where: { userAccountId: userId },
    });
    if (!subject) {
      throw new NotFoundException('Không tìm thấy hồ sơ đối tượng');
    }
    const requestCode = `REQ-${Date.now()}`;

    const result = await this.dataSource.query(
      `INSERT INTO requests (code, subject_id, type, reason, details )
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, code, type, reason, details, status, created_at`,
      [requestCode, subject.id, data.type, data.reason, JSON.stringify(data.details || {})],
    );

    this.logger.log(
      `Request created: ${result[0].id} (${data.type}) by subject ${subject.id}`,
    );

    return result[0];
  }

  /**
   * Get a single request by ID.
   */
  async findOne(requestId: string) {
    const rows = await this.dataSource.query(
      `SELECT r.id, r.subject_id, r.type, r.reason, r.details, r.status,
              r.reviewed_by, u.full_name AS reviewed_by_name,
              r.reviewed_at, r.review_note,
              r.created_at, r.updated_at
       FROM requests r
       LEFT JOIN users u ON u.id = r.reviewed_by
       WHERE r.id = $1`,
      [requestId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    return rows[0];
  }
}
