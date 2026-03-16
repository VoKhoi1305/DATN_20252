const login = {
  title: 'Đăng nhập hệ thống',
  subtitle: 'Nhập tài khoản để tiếp tục',
  usernameLabel: 'Tên đăng nhập',
  usernamePlaceholder: 'Nhập tên đăng nhập',
  passwordLabel: 'Mật khẩu',
  passwordPlaceholder: 'Nhập mật khẩu',
  submit: 'Đăng nhập',
  submitting: 'Đang đăng nhập...',
  usernameRequired: 'Vui lòng nhập tên đăng nhập',
  usernameMinLength: 'Tên đăng nhập tối thiểu 3 ký tự',
  passwordRequired: 'Vui lòng nhập mật khẩu',
  passwordMinLength: 'Mật khẩu tối thiểu 6 ký tự',
  sessionExpired: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  err401: 'Tên đăng nhập hoặc mật khẩu không đúng',
  err403: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.',
  err429: 'Quá nhiều lần thử. Vui lòng đợi 5 phút.',
  errSystem: 'Lỗi hệ thống. Vui lòng thử lại sau.',
} as const;

export default login;
