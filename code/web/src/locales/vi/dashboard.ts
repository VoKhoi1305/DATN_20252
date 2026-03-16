const dashboard = {
  // Page
  pageTitle: 'Tổng quan',
  breadcrumb: 'Dashboard',

  // Stat cards
  statTotalSubjects: 'Tổng đối tượng',
  statComplianceRate: 'Tỷ lệ tuân thủ',
  statOpenAlerts: 'Alert đang mở',
  statOpenCases: 'Case đang mở',
  statComparedTo: 'so với',
  statToday: 'hôm nay',
  statNewToday: 'mới hôm nay',

  // Event table
  eventTitle: 'Event gần đây',
  eventColTime: 'Thời gian',
  eventColCode: 'Mã Event',
  eventColSubject: 'Đối tượng',
  eventColType: 'Loại',
  eventColResult: 'Kết quả',
  eventEmptyTitle: 'Chưa có sự kiện nào',
  eventEmptySubtitle: 'Chưa có sự kiện trong khoảng thời gian này',

  // Event result badges
  eventResultValid: 'Hợp lệ',
  eventResultViolation: 'Vi phạm',
  eventResultOverdue: 'Quá hạn',
  eventResultProcessing: 'Đang xử lý',
  eventResultPending: 'Chờ xác minh',

  // Alert table
  alertTitle: 'Alert đang mở',
  alertColCode: 'Mã Alert',
  alertColSubject: 'Đối tượng',
  alertColType: 'Loại Alert',
  alertColSeverity: 'Mức độ',
  alertColTime: 'Thời gian',
  alertEmptyTitle: 'Không có cảnh báo đang mở',
  alertEmptySubtitle: 'Hệ thống hoạt động bình thường',

  // Alert severity badges
  alertSeverityKhanCap: 'Khẩn cấp',
  alertSeverityCao: 'Cao',
  alertSeverityTrungBinh: 'Trung bình',
  alertSeverityThap: 'Thấp',

  // Compliance chart
  chartTitle: 'Compliance 7 ngày gần nhất',
  chartNoData: 'Chưa có dữ liệu',

  // Actions
  viewAll: 'Xem tất cả',
  retry: 'Thử lại',

  // Errors
  errForbidden: 'Bạn không có quyền truy cập Dashboard.',
  errLoadSummary: 'Không thể tải dữ liệu tổng quan.',
  errLoadEvents: 'Không thể tải sự kiện gần đây.',
  errLoadAlerts: 'Không thể tải cảnh báo.',
} as const;

export default dashboard;
