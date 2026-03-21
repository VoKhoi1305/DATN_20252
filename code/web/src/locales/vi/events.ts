const events = {
  // Page
  pageTitle: 'Nhật ký sự kiện',
  documentTitle: 'Sự kiện — SMTTS',

  // Breadcrumbs
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbEvents: 'Sự kiện',
  breadcrumbDetail: 'Chi tiết sự kiện',

  // Table columns
  colTime: 'Thời gian',
  colCode: 'Mã',
  colSubject: 'Đối tượng',
  colType: 'Loại',
  colResult: 'Kết quả',
  colGps: 'GPS',
  colFace: 'Khuôn mặt',
  colNfc: 'NFC',
  colActions: '',

  // Filters
  filterAll: 'Tất cả',
  filterType: 'Loại sự kiện',
  filterResult: 'Kết quả',
  filterSubject: 'Đối tượng',
  filterFrom: 'Từ ngày',
  filterTo: 'Đến ngày',
  filterApply: 'Lọc',
  filterClear: 'Xoá bộ lọc',

  // Event types
  typeCHECK_IN: 'Điểm danh',
  typeFACE_MISMATCH: 'Sai khuôn mặt',
  typeNFC_FAIL: 'NFC thất bại',
  typeCHECKIN_OVERDUE: 'Quá hạn',
  typeSEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
  typeGEOFENCE_VIOLATION: 'Vi phạm khu vực',
  typeCURFEW_VIOLATION: 'Vi phạm giới nghiêm',
  typeOTHER: 'Khác',

  // Results
  resultSUCCESS: 'Thành công',
  resultFAILED: 'Thất bại',
  resultWARNING: 'Cảnh báo',

  // Detail
  detailTitle: 'Chi tiết sự kiện',
  sectionGeneral: 'Thông tin chung',
  sectionBiometric: 'Sinh trắc học',
  sectionLocation: 'Vị trí',
  sectionDevice: 'Thiết bị',

  lblCode: 'Mã sự kiện',
  lblType: 'Loại',
  lblResult: 'Kết quả',
  lblSubject: 'Đối tượng',
  lblTime: 'Thời gian',
  lblClientTime: 'Thời gian thiết bị',
  lblVoluntary: 'Tự nguyện',
  lblFaceScore: 'Điểm nhận diện',
  lblLiveness: 'Điểm liveness',
  lblNfcVerified: 'NFC xác minh',
  lblNfcCccdMatch: 'NFC khớp CCCD',
  lblFaceImage: 'Ảnh khuôn mặt',
  lblGpsLat: 'Vĩ độ',
  lblGpsLng: 'Kinh độ',
  lblGpsAccuracy: 'Độ chính xác (m)',
  lblInGeofence: 'Trong khu vực',
  lblGeofenceDistance: 'Khoảng cách (m)',
  lblDeviceId: 'Mã thiết bị',
  lblDeviceInfo: 'Thông tin thiết bị',

  // Booleans
  yes: 'Có',
  no: 'Không',

  // Empty
  emptyTitle: 'Chưa có sự kiện nào',
  emptySubtitle: 'Sự kiện sẽ được ghi nhận khi đối tượng thực hiện điểm danh',

  // Errors
  errSystem: 'Lỗi hệ thống',
  errNotFound: 'Không tìm thấy sự kiện',
  retry: 'Thử lại',

  // Pagination
  paginationInfo: (from: number, to: number, total: number) =>
    `${from}–${to} / ${total} sự kiện`,

  // Back
  back: 'Quay lại',
  viewDetail: 'Xem chi tiết',
} as const;

export default events;
