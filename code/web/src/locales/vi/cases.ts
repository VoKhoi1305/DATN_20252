const cases = {
  // Page
  pageTitle: 'Vụ việc',
  documentTitle: 'Vụ việc — SMTTS',

  // Breadcrumbs
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbCases: 'Vụ việc',
  breadcrumbDetail: 'Chi tiết vụ việc',

  // Tabs
  tabOpen: 'Đang mở',
  tabClosed: 'Đã đóng',

  // Table columns
  colTime: 'Thời gian',
  colCode: 'Mã',
  colSubject: 'Đối tượng',
  colSeverity: 'Mức độ',
  colStatus: 'Trạng thái',
  colSource: 'Nguồn',
  colAssignee: 'Phụ trách',
  colActions: '',

  // Filters
  filterAll: 'Tất cả',
  filterSeverity: 'Mức độ',
  filterSource: 'Nguồn',
  filterFrom: 'Từ ngày',
  filterTo: 'Đến ngày',
  filterClear: 'Xoá bộ lọc',

  // Severities (reuse alert levels)
  severityTHAP: 'Thấp',
  severityTRUNG_BINH: 'Trung bình',
  severityCAO: 'Cao',
  severityKHAN_CAP: 'Khẩn cấp',

  // Statuses
  statusOPEN: 'Đang mở',
  statusCLOSED: 'Đã đóng',

  // Sources
  sourceAUTO: 'Tự động',
  sourceMANUAL_ESCALATE: 'Chuyển từ cảnh báo',
  sourceMANUAL_NEW: 'Tạo thủ công',

  // Actions
  createCase: 'Tạo vụ việc mới',
  closeCase: 'Đóng vụ việc',
  reopenCase: 'Mở lại vụ việc',
  addNote: 'Thêm ghi chú',
  viewDetail: 'Xem chi tiết',

  // Detail
  detailTitle: 'Chi tiết vụ việc',
  sectionInfo: 'Thông tin vụ việc',
  sectionEscalation: 'Thông tin chuyển vụ',
  sectionNotes: 'Ghi chú',
  sectionLinkedEvents: 'Sự kiện liên quan',

  lblCode: 'Mã vụ việc',
  lblSubject: 'Đối tượng',
  lblSeverity: 'Mức độ',
  lblStatus: 'Trạng thái',
  lblSource: 'Nguồn tạo',
  lblDescription: 'Mô tả',
  lblAssignee: 'Người phụ trách',
  lblCreatedBy: 'Tạo bởi',
  lblCreatedAt: 'Thời gian tạo',
  lblClosedAt: 'Thời gian đóng',
  lblClosingNote: 'Ghi chú đóng',
  lblClosedBy: 'Đóng bởi',
  lblEscalationType: 'Loại chuyển',
  lblEscalationReason: 'Lý do chuyển',
  lblEscalationRule: 'Quy tắc kích hoạt',
  lblFromAlert: 'Từ cảnh báo',
  lblRelatedCase: 'Vụ việc liên quan',
  lblLinkedEvents: 'Sự kiện liên quan',

  // Escalation types
  escalationAUTO: 'Tự động (hệ thống)',
  escalationMANUAL: 'Thủ công (cán bộ)',

  // Create case modal
  createTitle: 'Tạo vụ việc mới',
  createSubjectLabel: 'Đối tượng',
  createSubjectPlaceholder: 'Nhập mã hoặc tên đối tượng...',
  createSeverityLabel: 'Mức độ nghiêm trọng',
  createDescLabel: 'Mô tả',
  createDescPlaceholder: 'Mô tả chi tiết vụ việc...',
  createConfirm: 'Tạo vụ việc',
  createCancel: 'Huỷ',

  // Close case modal
  closeTitle: 'Đóng vụ việc',
  closeDesc: 'Đóng vụ việc này. Vụ việc đã đóng sẽ chuyển sang chế độ chỉ đọc.',
  closeNoteLabel: 'Ghi chú đóng (bắt buộc)',
  closeNotePlaceholder: 'Mô tả kết quả xử lý vụ việc...',
  closeNoteMin: 'Ghi chú phải có ít nhất 10 ký tự',
  closeConfirm: 'Xác nhận đóng',
  closeCancel: 'Huỷ',

  // Reopen
  reopenTitle: 'Mở lại vụ việc',
  reopenDesc: 'Tạo vụ việc mới liên kết với vụ việc đã đóng này.',
  reopenConfirm: 'Xác nhận mở lại',
  reopenCancel: 'Huỷ',

  // Notes
  notePlaceholder: 'Nhập ghi chú...',
  noteSubmit: 'Gửi',
  noteEmpty: 'Chưa có ghi chú',

  // Messages
  msgCreateSuccess: 'Tạo vụ việc thành công',
  msgCloseSuccess: 'Đóng vụ việc thành công',
  msgReopenSuccess: 'Đã tạo vụ việc mới liên kết',
  msgNoteSuccess: 'Thêm ghi chú thành công',
  msgError: 'Có lỗi xảy ra',

  // Empty
  emptyTitle: 'Không có vụ việc nào',
  emptySubtitle: 'Vụ việc sẽ được tạo khi có cảnh báo nghiêm trọng hoặc do cán bộ tạo thủ công',

  // Errors
  errSystem: 'Lỗi hệ thống',
  errNotFound: 'Không tìm thấy vụ việc',
  retry: 'Thử lại',

  // Pagination
  paginationInfo: (from: number, to: number, total: number) =>
    `${from}–${to} / ${total} vụ việc`,

  back: 'Quay lại',
} as const;

export default cases;
