const scenarios = {
  // Page
  pageTitle: 'Kịch bản quản lý',
  documentTitle: 'Kịch bản — SMTTS',

  // Actions
  addScenario: 'Tạo kịch bản',
  editScenario: 'Chỉnh sửa',
  deleteScenario: 'Xoá',
  viewDetail: 'Xem chi tiết',

  // Status
  statusDraft: 'Nháp',
  statusPending: 'Chờ duyệt',
  statusActive: 'Đang hoạt động',
  statusSuspended: 'Tạm ngưng',
  statusExpired: 'Hết hạn',

  // Fields
  lblName: 'Tên kịch bản',
  lblDescription: 'Mô tả',
  lblScope: 'Phạm vi',
  lblStatus: 'Trạng thái',
  lblCheckinFreq: 'Tần suất điểm danh',
  lblCheckinWindow: 'Khung giờ điểm danh',
  lblGracePeriod: 'Hạn gia hạn (ngày)',
  lblFaceThreshold: 'Ngưỡng nhận diện khuôn mặt (%)',
  lblNfcRequired: 'Yêu cầu NFC',
  lblFallbackAllowed: 'Cho phép fallback',
  lblGeofence: 'Khu vực quản lý',
  lblCurfew: 'Giờ giới nghiêm',
  lblCurfewStart: 'Bắt đầu',
  lblCurfewEnd: 'Kết thúc',
  lblTravelApproval: 'Yêu cầu phê duyệt đi xa',
  lblTravelDays: 'Ngưỡng ngày đi xa',
  lblEffective: 'Thời gian hiệu lực',
  lblEffectiveFrom: 'Từ ngày',
  lblEffectiveTo: 'Đến ngày',
  lblSubjectCount: 'Đối tượng',
  lblCreatedAt: 'Ngày tạo',
  lblCode: 'Mã',

  // Frequency options
  freqDaily: 'Hàng ngày',
  freqWeekly: 'Hàng tuần',
  freqBiweekly: '2 tuần/lần',
  freqMonthly: 'Hàng tháng',

  // Scope options
  scopeDistrict: 'Quận/Huyện',
  scopeProvince: 'Tỉnh/Thành phố',
  scopeSystem: 'Toàn hệ thống',

  // Form
  formSave: 'Lưu',
  formCancel: 'Huỷ',
  formClose: 'Đóng',
  formSubmitApproval: 'Gửi duyệt',
  formApprove: 'Phê duyệt',
  formSuspend: 'Tạm ngưng',
  formReactivate: 'Kích hoạt lại',

  // Placeholders
  phName: 'VD: Kịch bản quản lý cơ sở',
  phDescription: 'Mô tả chi tiết kịch bản...',
  phSearch: 'Tìm kịch bản...',

  // Messages
  msgCreateSuccess: 'Tạo kịch bản thành công',
  msgUpdateSuccess: 'Cập nhật kịch bản thành công',
  msgDeleteSuccess: 'Xoá kịch bản thành công',
  msgDeleteConfirm: 'Bạn có chắc chắn muốn xoá kịch bản này?',
  msgStatusSuccess: 'Cập nhật trạng thái thành công',
  msgError: 'Có lỗi xảy ra',

  // Table
  colName: 'Tên kịch bản',
  colCode: 'Mã',
  colStatus: 'Trạng thái',
  colFrequency: 'Tần suất',
  colSubjects: 'Đối tượng',
  colGeofence: 'Khu vực',
  colActions: '',

  // Empty
  emptyTitle: 'Chưa có kịch bản nào',
  emptySubtitle: 'Tạo kịch bản quản lý đầu tiên',

  // Sections
  sectionCheckin: 'Quy tắc điểm danh',
  sectionMonitoring: 'Giám sát',
  sectionGeneral: 'Thông tin chung',

  // Boolean
  yes: 'Có',
  no: 'Không',

  // No geofence
  noGeofence: 'Chưa gắn khu vực',
  selectGeofence: '-- Chọn khu vực --',
} as const;

export default scenarios;
