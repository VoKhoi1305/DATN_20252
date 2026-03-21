const trace = {
  pageTitle: 'Truy vết đối tượng',
  subtitle: 'Tìm kiếm và theo dõi vị trí check-in của đối tượng trên bản đồ',
  searchLabel: 'Số CCCD',
  searchPlaceholder: 'Nhập 12 số CCCD...',
  searchBtn: 'Truy vết',
  searching: 'Đang tìm...',
  resultSubject: 'Thông tin đối tượng',
  resultEvents: 'Lịch sử sự kiện',
  resultMap: 'Bản đồ vị trí',
  eventCount: (n: number) => `${n} sự kiện`,
  noResults: 'Không tìm thấy đối tượng',
  noResultsSubtitle: 'Kiểm tra lại số CCCD và thử lại',
  emptyTitle: 'Nhập CCCD để bắt đầu truy vết',
  emptySubtitle: 'Hệ thống sẽ hiển thị tất cả vị trí check-in trên bản đồ',

  // Event type labels
  typeCHECKIN: 'Điểm danh',
  typeCHECKIN_OVERDUE: 'Quá hạn',
  typeFACE_MISMATCH: 'Sai khuôn mặt',
  typeNFC_FAIL: 'NFC thất bại',
  typeSEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
  typeGEOFENCE_VIOLATION: 'Vi phạm khu vực',
  typeOTHER: 'Khác',

  // Result labels
  resultSUCCESS: 'Thành công',
  resultFAILED: 'Thất bại',
  resultWARNING: 'Cảnh báo',

  // Map labels
  inGeofence: 'Trong vùng',
  outGeofence: 'Ngoài vùng',
  noGps: 'Không có GPS',

  // Table columns
  colTime: 'Thời gian',
  colType: 'Loại sự kiện',
  colResult: 'Kết quả',
  colLocation: 'Vị trí',
  colInGeofence: 'Trong vùng',

  // Misc
  errSystem: 'Lỗi hệ thống',
  documentTitle: 'Truy vết — SMTTS',
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbTrace: 'Truy vết',

  // Subject info labels
  lblName: 'Họ tên',
  lblCccd: 'Số CCCD',
  lblAddress: 'Địa chỉ',
  lblPhone: 'Số điện thoại',
} as const;

export default trace;
