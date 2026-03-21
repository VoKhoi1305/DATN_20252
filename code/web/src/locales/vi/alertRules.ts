const alertRules = {
  // Page
  pageTitle: 'Quy tắc cảnh báo',
  documentTitle: 'Quy tắc cảnh báo — SMTTS',
  subtitle: 'Xây dựng và quản lý quy tắc tự động tạo cảnh báo cho từng kịch bản',

  // Breadcrumbs
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbAlertRules: 'Quy tắc cảnh báo',

  // Scenario selector
  scenarioLabel: 'Kịch bản quản lý',
  scenarioPlaceholder: 'Chọn kịch bản...',
  scenarioEmpty: 'Không có kịch bản nào',

  // Sections
  sectionDefault: 'Quy tắc mặc định',
  sectionDefaultDesc: 'Các quy tắc hệ thống tạo sẵn — có thể điều chỉnh tham số nhưng không thể xoá',
  sectionCustom: 'Quy tắc tuỳ chỉnh',
  sectionCustomDesc: 'Quy tắc do cán bộ tạo thêm cho kịch bản này',
  sectionPipeline: 'Quy trình xử lý tự động',

  // Event types
  eventCHECK_IN: 'Điểm danh',
  eventCHECKIN_OVERDUE: 'Quá hạn điểm danh',
  eventSEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
  eventFACE_MISMATCH: 'Sai khuôn mặt',
  eventNFC_FAIL: 'NFC thất bại',
  eventNFC_MISMATCH: 'NFC không khớp CCCD',
  eventGEOFENCE_VIOLATION: 'Vi phạm khu vực',

  // Alert levels
  levelTHAP: 'Thấp',
  levelTRUNG_BINH: 'Trung bình',
  levelCAO: 'Cao',
  levelKHAN_CAP: 'Khẩn cấp',

  // Condition operators
  opGte: 'lớn hơn hoặc bằng (>=)',
  opLte: 'nhỏ hơn hoặc bằng (<=)',
  opEq: 'bằng (==)',
  opGt: 'lớn hơn (>)',
  opLt: 'nhỏ hơn (<)',

  // Condition builder sentence parts
  condWhen: 'KHI',
  condOccurs: 'XẢY RA',
  condWithin: 'TRONG',
  condDays: 'ngày',
  condThen: 'THÌ TẠO CẢNH BÁO MỨC',
  condEvents: 'sự kiện',

  // Preview sentence template
  previewPrefix: 'Khi có',
  previewEventIn: 'sự kiện',
  previewWithin: 'trong',
  previewDays: 'ngày',
  previewThen: 'Tạo cảnh báo mức',

  // Form labels
  formTitle: 'Tạo quy tắc mới',
  formEditTitle: 'Chỉnh sửa quy tắc',
  formName: 'Tên quy tắc',
  formNamePlaceholder: 'VD: Cảnh báo sai khuôn mặt liên tiếp',
  formEventType: 'Loại sự kiện',
  formEventTypePlaceholder: 'Chọn loại sự kiện...',
  formOperator: 'Điều kiện',
  formOperatorPlaceholder: 'Chọn phép so sánh...',
  formValue: 'Số lượng',
  formValuePlaceholder: 'VD: 3',
  formWindowDays: 'Khoảng thời gian (ngày)',
  formWindowDaysPlaceholder: 'VD: 7',
  formWindowDaysHint: 'Để trống nếu không giới hạn thời gian',
  formAlertLevel: 'Mức cảnh báo',
  formIsActive: 'Kích hoạt ngay',

  // Buttons
  btnCreate: 'Tạo quy tắc',
  btnSave: 'Lưu thay đổi',
  btnCancel: 'Huỷ',
  btnEdit: 'Sửa',
  btnDelete: 'Xoá',

  // Confirmation
  deleteTitle: 'Xác nhận xoá quy tắc',
  deleteMessage: (name: string) => `Bạn có chắc chắn muốn xoá quy tắc "${name}"? Hành động này không thể hoàn tác.`,
  deleteConfirm: 'Xoá quy tắc',
  deleteCancel: 'Huỷ',

  // Success/error messages
  msgCreateSuccess: 'Đã tạo quy tắc mới',
  msgUpdateSuccess: 'Đã cập nhật quy tắc',
  msgDeleteSuccess: 'Đã xoá quy tắc',
  msgToggleOnSuccess: 'Đã kích hoạt quy tắc',
  msgToggleOffSuccess: 'Đã tắt quy tắc',
  msgError: 'Có lỗi xảy ra',
  msgLoadError: 'Không thể tải danh sách quy tắc',

  // Default rule protection
  defaultRuleLock: 'Mặc định',
  defaultRuleHint: 'Quy tắc mặc định không thể xoá, chỉ có thể điều chỉnh tham số',

  // Empty states
  emptyNoScenario: 'Vui lòng chọn một kịch bản để xem và quản lý quy tắc cảnh báo',
  emptyNoScenarioSubtitle: 'Chọn kịch bản từ danh sách phía trên để bắt đầu',
  emptyNoCustomRules: 'Chưa có quy tắc tuỳ chỉnh',
  emptyNoCustomRulesSubtitle: 'Tạo quy tắc mới để giám sát các tình huống đặc biệt',

  // Pipeline info
  pipelineTitle: 'Quy trình: Sự kiện → Quy tắc → Cảnh báo → Vụ việc',
  pipelineEvent: 'Sự kiện',
  pipelineEventDesc: 'Hệ thống ghi nhận tự động',
  pipelineRule: 'Quy tắc cảnh báo',
  pipelineRuleDesc: 'Kiểm tra điều kiện',
  pipelineAlert: 'Cảnh báo',
  pipelineAlertDesc: 'Thông báo cho cán bộ',
  pipelineCase: 'Vụ việc',
  pipelineCaseDesc: 'Xử lý chính thức',
  pipelineAutoEscalate: 'Cảnh báo mức CAO hoặc KHẨN CẤP sẽ tự động tạo Vụ việc',

  // Toggle
  toggleActive: 'Đang bật',
  toggleInactive: 'Đang tắt',

  // Misc
  retry: 'Thử lại',
  errSystem: 'Lỗi hệ thống',
} as const;

export default alertRules;
