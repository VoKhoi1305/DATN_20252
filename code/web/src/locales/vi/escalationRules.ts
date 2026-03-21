const escalationRules = {
  // Page
  pageTitle: 'Quy tắc leo thang',
  documentTitle: 'Quy tắc leo thang — SMTTS',
  subtitle: 'Xây dựng quy tắc tự động tạo vụ việc từ cảnh báo',

  // Breadcrumbs
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbEscalationRules: 'Quy tắc leo thang',

  // Scenario selector
  scenarioLabel: 'Kịch bản quản lý',
  scenarioPlaceholder: 'Chọn kịch bản...',
  scenarioEmpty: 'Không có kịch bản nào',

  // Sections
  sectionDefault: 'Quy tắc mặc định',
  sectionDefaultDesc: 'Các quy tắc hệ thống tạo sẵn — có thể điều chỉnh tham số nhưng không thể xoá',
  sectionCustom: 'Quy tắc tuỳ chỉnh',
  sectionCustomDesc: 'Quy tắc do cán bộ tạo thêm cho kịch bản này',
  sectionPipeline: 'Quy trình leo thang tự động',

  // Alert types
  typeOVERDUE: 'Quá hạn',
  typeFACE_MISMATCH_STREAK: 'Sai khuôn mặt liên tiếp',
  typeSEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
  typeNFC_CCCD_MISMATCH: 'NFC không khớp CCCD',
  typeGEOFENCE_VIOLATION: 'Vi phạm khu vực',
  typeStar: 'Tất cả loại cảnh báo',

  // Case severity levels
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
  condWhen: 'KHI CÓ',
  condAlertType: 'loại cảnh báo',
  condLevel: 'mức',
  condOccurs: 'XẢY RA',
  condConsecutive: 'liên tiếp',
  condWithin: 'TRONG',
  condDays: 'ngày',
  condThen: 'THÌ TẠO VỤ VIỆC MỨC',
  condAlerts: 'cảnh báo',

  // Preview sentence template
  previewPrefix: 'Khi có',
  previewAlerts: 'cảnh báo',
  previewLevel: 'mức',
  previewConsecutive: 'liên tiếp',
  previewWithin: 'trong',
  previewDays: 'ngày',
  previewThen: 'Tạo vụ việc mức',

  // Form labels
  formTitle: 'Tạo quy tắc leo thang mới',
  formEditTitle: 'Chỉnh sửa quy tắc leo thang',
  formName: 'Tên quy tắc',
  formNamePlaceholder: 'VD: Tự động tạo vụ việc khi sai khuôn mặt nhiều lần',
  formAlertType: 'Loại cảnh báo',
  formAlertTypePlaceholder: 'Chọn loại cảnh báo...',
  formAlertLevelFilter: 'Lọc theo mức cảnh báo',
  formAlertLevelFilterPlaceholder: 'Không lọc (tất cả mức)',
  formAlertLevelFilterHint: 'Để trống nếu muốn áp dụng cho tất cả mức cảnh báo',
  formOperator: 'Điều kiện',
  formOperatorPlaceholder: 'Chọn phép so sánh...',
  formValue: 'Số lượng',
  formValuePlaceholder: 'VD: 3',
  formConsecutive: 'Phải liên tiếp',
  formWindowDays: 'Khoảng thời gian (ngày)',
  formWindowDaysPlaceholder: 'VD: 7',
  formWindowDaysHint: 'Để trống nếu không giới hạn thời gian',
  formCaseSeverity: 'Mức vụ việc',
  formAutoAssign: 'Tự động phân công',
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
  msgCreateSuccess: 'Đã tạo quy tắc leo thang mới',
  msgUpdateSuccess: 'Đã cập nhật quy tắc leo thang',
  msgDeleteSuccess: 'Đã xoá quy tắc leo thang',
  msgToggleOnSuccess: 'Đã kích hoạt quy tắc',
  msgToggleOffSuccess: 'Đã tắt quy tắc',
  msgError: 'Có lỗi xảy ra',
  msgLoadError: 'Không thể tải danh sách quy tắc leo thang',

  // Default rule protection
  defaultRuleLock: 'Mặc định',
  defaultRuleHint: 'Quy tắc mặc định không thể xoá, chỉ có thể điều chỉnh tham số',

  // Empty states
  emptyNoScenario: 'Vui lòng chọn một kịch bản để xem và quản lý quy tắc leo thang',
  emptyNoScenarioSubtitle: 'Chọn kịch bản từ danh sách phía trên để bắt đầu',
  emptyNoCustomRules: 'Chưa có quy tắc leo thang tuỳ chỉnh',
  emptyNoCustomRulesSubtitle: 'Tạo quy tắc mới để tự động chuyển cảnh báo thành vụ việc',

  // Pipeline info
  pipelineTitle: 'Quy trình: Cảnh báo → Quy tắc leo thang → Vụ việc',
  pipelineAlert: 'Cảnh báo',
  pipelineAlertDesc: 'Từ hệ thống cảnh báo',
  pipelineRule: 'Quy tắc leo thang',
  pipelineRuleDesc: 'Kiểm tra điều kiện',
  pipelineCase: 'Vụ việc',
  pipelineCaseDesc: 'Xử lý chính thức',
  pipelineAutoEscalate: 'Khi cảnh báo thoả mãn điều kiện, hệ thống tự động tạo Vụ việc tương ứng',

  // Toggle
  toggleActive: 'Đang bật',
  toggleInactive: 'Đang tắt',

  // Misc
  retry: 'Thử lại',
  errSystem: 'Lỗi hệ thống',
} as const;

export default escalationRules;
