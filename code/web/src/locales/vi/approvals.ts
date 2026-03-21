const approvals = {
  // Page
  pageTitle: 'Xét duyệt kịch bản',
  documentTitle: 'Xét duyệt — SMTTS',

  // Table
  colCode: 'Mã',
  colName: 'Tên kịch bản',
  colScope: 'Phạm vi',
  colFrequency: 'Tần suất',
  colGeofence: 'Khu vực',
  colCreatedAt: 'Ngày tạo',
  colActions: '',

  // Scope
  scopeDistrict: 'Quận/Huyện',
  scopeProvince: 'Tỉnh/Thành phố',
  scopeSystem: 'Toàn hệ thống',

  // Frequency
  freqDaily: 'Hàng ngày',
  freqWeekly: 'Hàng tuần',
  freqBiweekly: '2 tuần/lần',
  freqMonthly: 'Hàng tháng',

  // Actions
  approve: 'Phê duyệt',
  reject: 'Từ chối',
  viewDetail: 'Xem chi tiết',

  // Detail
  detailTitle: 'Chi tiết kịch bản',
  lblName: 'Tên kịch bản',
  lblCode: 'Mã',
  lblScope: 'Phạm vi',
  lblStatus: 'Trạng thái',
  lblDescription: 'Mô tả',
  lblCheckinFreq: 'Tần suất điểm danh',
  lblCheckinWindow: 'Khung giờ điểm danh',
  lblGracePeriod: 'Hạn gia hạn (ngày)',
  lblFaceThreshold: 'Ngưỡng nhận diện khuôn mặt',
  lblNfcRequired: 'Yêu cầu NFC',
  lblFallbackAllowed: 'Cho phép fallback',
  lblGeofence: 'Khu vực quản lý',
  lblCurfew: 'Giờ giới nghiêm',
  lblTravelApproval: 'Yêu cầu phê duyệt đi xa',
  lblTravelDays: 'Ngưỡng ngày đi xa',
  lblEffective: 'Thời gian hiệu lực',
  lblSubjectCount: 'Đối tượng',
  lblCreatedAt: 'Ngày tạo',
  lblVersion: 'Phiên bản',

  // Sections
  sectionGeneral: 'Thông tin chung',
  sectionCheckin: 'Quy tắc điểm danh',
  sectionMonitoring: 'Giám sát',

  // Status
  statusPending: 'Chờ duyệt',

  // Messages
  msgApproveSuccess: 'Phê duyệt kịch bản thành công',
  msgRejectSuccess: 'Từ chối kịch bản thành công',
  msgError: 'Có lỗi xảy ra',
  msgApproveConfirm: 'Bạn có chắc chắn muốn phê duyệt kịch bản này?',
  msgRejectConfirm: 'Bạn có chắc chắn muốn từ chối kịch bản này?',

  // Empty
  emptyTitle: 'Không có kịch bản nào chờ duyệt',
  emptySubtitle: 'Tất cả kịch bản đã được xử lý',

  // Boolean
  yes: 'Có',
  no: 'Không',

  // No geofence
  noGeofence: 'Chưa gắn khu vực',

  // Back
  back: 'Quay lại',
} as const;

export default approvals;
