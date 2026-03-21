const users = {
  // Page
  documentTitle: 'Quản lý tài khoản — SMTTS',
  pageTitle: 'Quản lý tài khoản',
  subtitleCount: (n: number) => `${n} tài khoản`,

  // Breadcrumbs
  breadcrumbDashboard: 'Tổng quan',
  breadcrumbUsers: 'Tài khoản',
  breadcrumbCreate: 'Tạo mới',
  breadcrumbEdit: 'Chỉnh sửa',

  // Buttons
  addUser: 'Thêm tài khoản',
  btnSave: 'Lưu',
  btnSaving: 'Đang lưu...',
  btnCancel: 'Hủy',
  btnEdit: 'Sửa',
  btnView: 'Xem',
  btnDelete: 'Xóa',
  btnResetPassword: 'Đặt lại mật khẩu',
  btnToggleStatus: 'Đổi trạng thái',
  btnUnlock: 'Mở khóa',

  // Table columns
  colUsername: 'Tên đăng nhập',
  colFullName: 'Họ và tên',
  colRole: 'Vai trò',
  colStatus: 'Trạng thái',
  colOtp: 'OTP',
  colLastLogin: 'Đăng nhập cuối',
  colCreatedAt: 'Ngày tạo',
  colActions: 'Thao tác',

  // Roles
  roleItAdmin: 'IT Admin',
  roleLanhDao: 'Lãnh đạo',
  roleCanBoQuanLy: 'Cán bộ quản lý',
  roleCanBoCoso: 'Cán bộ cơ sở',
  roleSubject: 'Đối tượng',

  // Status
  statusActive: 'Hoạt động',
  statusLocked: 'Bị khóa',
  statusDeactivated: 'Vô hiệu hóa',

  // Data scope
  scopeDistrict: 'Quận/Huyện',
  scopeProvince: 'Tỉnh/Thành phố',
  scopeSystem: 'Toàn hệ thống',

  // Filters
  filterAll: 'Tất cả',
  filterRole: 'Vai trò',
  filterStatus: 'Trạng thái',
  searchPlaceholder: 'Tìm theo tên, username, email...',
  clearFilters: 'Xóa bộ lọc',

  // Form labels
  lblUsername: 'Tên đăng nhập',
  lblPassword: 'Mật khẩu',
  lblFullName: 'Họ và tên',
  lblEmail: 'Email',
  lblPhone: 'Số điện thoại',
  lblRole: 'Vai trò',
  lblArea: 'Đơn vị quản lý',
  lblDataScope: 'Phạm vi dữ liệu',
  lblStatus: 'Trạng thái',
  lblNewPassword: 'Mật khẩu mới',

  // Placeholders
  phUsername: 'vd: canbo.xuantrung',
  phPassword: 'Tối thiểu 8 ký tự',
  phFullName: 'Nguyễn Văn A',
  phEmail: 'email@example.com',
  phPhone: '0912345678',
  phArea: 'Chọn đơn vị...',
  phNewPassword: 'Nhập mật khẩu mới...',

  // Validation
  valRequired: 'Bắt buộc nhập',
  valUsernameMin: 'Tối thiểu 3 ký tự',
  valUsernameFormat: 'Chỉ chứa chữ, số, dấu chấm và gạch dưới',
  valPasswordMin: 'Tối thiểu 8 ký tự',
  valEmailFormat: 'Email không hợp lệ',
  valSelectRole: 'Vui lòng chọn vai trò',
  valSelectScope: 'Vui lòng chọn phạm vi dữ liệu',

  // Messages
  createSuccess: 'Tạo tài khoản thành công.',
  updateSuccess: 'Cập nhật tài khoản thành công.',
  deleteSuccess: 'Xóa tài khoản thành công.',
  resetPasswordSuccess: 'Đặt lại mật khẩu thành công.',
  toggleStatusSuccess: 'Đổi trạng thái thành công.',
  unlockSuccess: 'Mở khóa tài khoản thành công.',
  usernameExists: 'Tên đăng nhập đã tồn tại.',

  // Errors
  errSystem: 'Có lỗi xảy ra, vui lòng thử lại.',
  errForbidden: 'Bạn không có quyền truy cập chức năng này.',
  errNotFound: 'Không tìm thấy tài khoản.',

  // Empty
  emptyTitle: 'Chưa có tài khoản nào',
  emptySubtitle: 'Tạo tài khoản mới để bắt đầu quản lý.',
  noResultsTitle: 'Không tìm thấy',
  noResultsSubtitle: 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',

  // Pagination
  paginationInfo: (from: number, to: number, total: number) =>
    `Hiển thị ${from}–${to} trong ${total}`,

  // Confirm
  confirmDelete: 'Bạn có chắc muốn xóa tài khoản này? Hành động không thể hoàn tác.',
  confirmResetPassword: 'Đặt lại mật khẩu cho tài khoản này?',
  confirmToggleDeactivate: 'Vô hiệu hóa tài khoản này?',
  confirmToggleActivate: 'Kích hoạt lại tài khoản này?',

  // Detail
  detailTitle: 'Chi tiết tài khoản',
  detailOtpEnabled: 'Đã bật',
  detailOtpDisabled: 'Chưa bật',
  detailLocked: 'Đang bị khóa đến',
  detailFailedLogins: 'Đăng nhập thất bại',
} as const;

export default users;
