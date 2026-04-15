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
                r.reviewed_by_id, u.full_name AS reviewed_by_name,
                r.reviewed_at, r.review_note,
                r.created_at, r.updated_at
         FROM requests r
         LEFT JOIN users u ON u.id = r.reviewed_by_id
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
   * Get a single request by ID (with subject info).
   */
  async findOne(requestId: string) {
    const rows = await this.dataSource.query(
      `SELECT r.id, r.code, r.subject_id, r.type, r.reason, r.details, r.status,
              r.reviewed_by_id, u.full_name AS reviewed_by_name,
              r.reviewed_at, r.review_note,
              r.created_at, r.updated_at,
              s.full_name AS subject_name, s.cccd_encrypted AS subject_cccd
       FROM requests r
       LEFT JOIN users u ON u.id = r.reviewed_by_id
       LEFT JOIN subjects s ON s.id = r.subject_id
       WHERE r.id = $1`,
      [requestId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    return rows[0];
  }

  /**
   * List all requests for officers with optional filters.
   */
  async listAll(params: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { status, search, page, limit } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      conditions.push(`r.status = $${idx++}`);
      values.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(s.full_name ILIKE $${idx} OR s.cccd_encrypted ILIKE $${idx})`);
      values.push(term);
      idx++;
    }

    const where = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const [items, total] = await Promise.all([
      this.dataSource.query(
        `SELECT r.id, r.code, r.type, r.reason, r.details, r.status,
                r.reviewed_by_id, u.full_name AS reviewed_by_name,
                r.reviewed_at, r.review_note,
                r.created_at, r.updated_at,
                r.subject_id, s.full_name AS subject_name, s.cccd_encrypted AS subject_cccd
         FROM requests r
         LEFT JOIN users u ON u.id = r.reviewed_by_id
         LEFT JOIN subjects s ON s.id = r.subject_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset],
      ),
      this.dataSource
        .query(
          `SELECT COUNT(*) FROM requests r
           LEFT JOIN subjects s ON s.id = r.subject_id
           ${where}`,
          values,
        )
        .then((r) => parseInt(r[0].count, 10)),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Review (approve / reject) a request.
   *
   * On APPROVED, runs type-specific side effects inside a transaction:
   *   - CHANGE_ADDRESS : immediately update subject's address
   *   - TRAVEL         : no immediate write — checkin service queries approved
   *                      travel windows at check-in time to waive geofence
   *   - POSTPONE       : no immediate write — overdue calculator queries
   *                      approved postpone dates to skip when counting
   *   - CHANGE_DEVICE  : handled separately via device enrollment flow
   */
  async review(
    requestId: string,
    reviewerId: string,
    action: 'APPROVED' | 'REJECTED',
    reviewNote?: string,
  ) {
    // Load full request (need type + details + subject_id for side effects)
    const existing = await this.dataSource.query(
      `SELECT id, status, type, details, subject_id
       FROM requests WHERE id = $1`,
      [requestId],
    );
    if (existing.length === 0) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }
    if (existing[0].status !== 'PENDING') {
      throw new NotFoundException('Yêu cầu đã được xử lý trước đó');
    }

    const req = existing[0];

    return this.dataSource.transaction(async (manager) => {
      // Apply side effects first (fail-fast: if side-effect fails, status stays PENDING)
      if (action === 'APPROVED') {
        await this.applyApprovalSideEffects(manager, req);
      }

      const rows = await manager.query(
        `UPDATE requests
         SET status = $1,
             reviewed_by_id = $2,
             review_note = $3,
             reviewed_at = NOW(),
             updated_at  = NOW()
         WHERE id = $4
         RETURNING id, code, type, status, reviewed_at, review_note`,
        [action, reviewerId, reviewNote || null, requestId],
      );

      this.logger.log(
        `Request ${requestId} (${req.type}) ${action} by user ${reviewerId}`,
      );

      return rows[0];
    });
  }

  /**
   * Apply side effects when a request is approved. Runs in the same
   * transaction as the status update so any failure rolls back.
   */
  private async applyApprovalSideEffects(
    manager: { query: (sql: string, params?: any[]) => Promise<any> },
    req: { id: string; type: string; details: any; subject_id: string },
  ): Promise<void> {
    const details = typeof req.details === 'string'
      ? JSON.parse(req.details || '{}')
      : (req.details || {});

    if (req.type === 'CHANGE_ADDRESS') {
      const newAddress = (details.new_address || details.newAddress || '').toString().trim();
      if (!newAddress) {
        this.logger.warn(
          `CHANGE_ADDRESS request ${req.id} approved but has no new_address in details`,
        );
        return;
      }
      await manager.query(
        `UPDATE subjects
         SET address = $1, updated_at = NOW()
         WHERE id = $2 AND deleted_at IS NULL`,
        [newAddress, req.subject_id],
      );
      this.logger.log(
        `Subject ${req.subject_id} address updated via request ${req.id}`,
      );
    }
    // TRAVEL & POSTPONE: no immediate DB write — consumed by checkin/alert engines.
  }

  /**
   * Returns true if the subject has an APPROVED TRAVEL request whose
   * [date_from, date_to] window covers the given date (inclusive).
   *
   * Used by CheckinService to waive geofence checks while a subject is on
   * an approved trip (they still must check in, but location is not enforced).
   *
   * Date strings in request details are expected as YYYY-MM-DD.
   */
  async hasApprovedTravelOn(subjectId: string, date: Date): Promise<boolean> {
    const iso = date.toISOString().slice(0, 10);
    const rows = await this.dataSource.query(
      `SELECT 1
       FROM requests
       WHERE subject_id = $1
         AND type = 'TRAVEL'
         AND status = 'APPROVED'
         AND (details->>'date_from') <= $2
         AND (details->>'date_to') >= $2
       LIMIT 1`,
      [subjectId, iso],
    );
    return rows.length > 0;
  }

  /**
   * Returns true if the subject has an APPROVED POSTPONE request for the
   * given date. Used by overdue calculators to skip that day when counting
   * consecutive days without check-in.
   */
  async isDatePostponed(subjectId: string, date: Date): Promise<boolean> {
    const iso = date.toISOString().slice(0, 10);
    const rows = await this.dataSource.query(
      `SELECT 1
       FROM requests
       WHERE subject_id = $1
         AND type = 'POSTPONE'
         AND status = 'APPROVED'
         AND (details->>'date') = $2
       LIMIT 1`,
      [subjectId, iso],
    );
    return rows.length > 0;
  }

  /**
   * Returns the set of APPROVED POSTPONE dates (YYYY-MM-DD) for a subject
   * within an optional date range. Overdue scheduler can use this to exclude
   * postponed days from its consecutive-missed-day count.
   */
  async getApprovedPostponeDates(
    subjectId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<Set<string>> {
    const conds: string[] = [
      `subject_id = $1`,
      `type = 'POSTPONE'`,
      `status = 'APPROVED'`,
    ];
    const values: any[] = [subjectId];
    let idx = 2;
    if (fromDate) {
      conds.push(`(details->>'date') >= $${idx++}`);
      values.push(fromDate.toISOString().slice(0, 10));
    }
    if (toDate) {
      conds.push(`(details->>'date') <= $${idx++}`);
      values.push(toDate.toISOString().slice(0, 10));
    }
    const rows = await this.dataSource.query(
      `SELECT details->>'date' AS date FROM requests WHERE ${conds.join(' AND ')}`,
      values,
    );
    return new Set(rows.map((r: any) => r.date).filter(Boolean));
  }
}
