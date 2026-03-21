const alerts = {
  // Page
  pageTitle: 'Cảnh báo',
  documentTitle: 'Cảnh báo — SMTTS',

  // Breadcrumbs
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbAlerts: 'Cảnh báo',
  breadcrumbDetail: 'Chi tiết cảnh báo',

  // Table columns
  colTime: 'Thời gian',
  colCode: 'Mã',
  colSubject: 'Đối tượng',
  colType: 'Loại',
  colLevel: 'Mức độ',
  colStatus: 'Trạng thái',
  colSource: 'Nguồn',
  colActions: '',

  // Filters
  filterAll: 'Tất cả',
  filterStatus: 'Trạng thái',
  filterLevel: 'Mức độ',
  filterType: 'Loại',
  filterSource: 'Nguồn quy tắc',
  filterFrom: 'Từ ngày',
  filterTo: 'Đến ngày',
  filterClear: 'Xoá bộ lọc',

  // Alert types
  typeOVERDUE: 'Quá hạn điểm danh',
  typeFACE_MISMATCH_STREAK: 'Sai khuôn mặt liên tiếp',
  typeNFC_CCCD_MISMATCH: 'NFC không khớp CCCD',
  typeSEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
  typeGEOFENCE_VIOLATION: 'Vi phạm khu vực',
  typeCURFEW_VIOLATION: 'Vi phạm giới nghiêm',
  typeOTHER: 'Khác',

  // Levels
  levelTHAP: 'Thấp',
  levelTRUNG_BINH: 'Trung bình',
  levelCAO: 'Cao',
  levelKHAN_CAP: 'Khẩn cấp',

  // Statuses
  statusOPEN: 'Mở',
  statusACKNOWLEDGED: 'Đã ghi nhận',
  statusRESOLVED: 'Đã xử lý',
  statusESCALATED: 'Đã chuyển vụ việc',

  // Sources
  sourceDEFAULT: 'Mặc định',
  sourceCUSTOM: 'Tuỳ chỉnh',

  // Actions
  acknowledge: 'Ghi nhận',
  resolve: 'Đánh dấu đã xử lý',
  escalate: 'Chuyển thành vụ việc',
  viewDetail: 'Xem chi tiết',

  // Detail
  detailTitle: 'Chi tiết cảnh báo',
  sectionInfo: 'Thông tin cảnh báo',
  sectionTrigger: 'Sự kiện kích hoạt',
  sectionEscalation: 'Thông tin chuyển vụ',

  lblCode: 'Mã cảnh báo',
  lblType: 'Loại',
  lblLevel: 'Mức độ',
  lblStatus: 'Trạng thái',
  lblSource: 'Nguồn quy tắc',
  lblSubject: 'Đối tượng',
  lblCreatedAt: 'Thời gian tạo',
  lblResolvedAt: 'Thời gian xử lý',
  lblEscalatedAt: 'Thời gian chuyển vụ',
  lblCaseId: 'Mã vụ việc',
  lblTriggerEvent: 'Sự kiện kích hoạt',
  lblScenario: 'Kịch bản',

  // Escalation modal
  escalateTitle: 'Chuyển thành vụ việc',
  escalateDesc: 'Tạo vụ việc mới từ cảnh báo này. Cảnh báo sẽ được đánh dấu là đã chuyển.',
  escalateReason: 'Lý do (tuỳ chọn)',
  escalateReasonPlaceholder: 'Nhập lý do chuyển vụ việc...',
  escalateConfirm: 'Xác nhận chuyển',
  escalateCancel: 'Huỷ',

  // Messages
  msgAckSuccess: 'Đã ghi nhận cảnh báo',
  msgResolveSuccess: 'Đã đánh dấu cảnh báo là đã xử lý',
  msgEscalateSuccess: 'Đã tạo vụ việc từ cảnh báo',
  msgError: 'Có lỗi xảy ra',

  // Empty
  emptyTitle: 'Không có cảnh báo nào',
  emptySubtitle: 'Hệ thống sẽ tạo cảnh báo khi phát hiện vi phạm',

  // Errors
  errSystem: 'Lỗi hệ thống',
  errNotFound: 'Không tìm thấy cảnh báo',
  retry: 'Thử lại',

  // Pagination
  paginationInfo: (from: number, to: number, total: number) =>
    `${from}–${to} / ${total} cảnh báo`,

  back: 'Quay lại',
} as const;

export default alerts;
