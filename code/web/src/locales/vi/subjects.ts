const subjects = {
  // Page
  pageTitle: 'Hồ sơ đối tượng',
  documentTitle: 'Hồ sơ đối tượng — SMTTS',
  breadcrumbDashboard: 'Dashboard',
  breadcrumbProfiles: 'Hồ sơ đối tượng',

  // Subtitle
  subtitleCount: (n: number) => `${n} đối tượng đang quản lý`,

  // Actions
  addProfile: 'Thêm hồ sơ',
  exportExcel: 'Xuất Excel',

  // Filter bar
  searchPlaceholder: 'Tìm tên, CCCD, SĐT, mã hồ sơ...',
  filterStatus: 'Trạng thái',
  filterScenario: 'Kịch bản',
  filterAll: 'Tất cả',
  filterDateFrom: 'Từ ngày',
  filterDateTo: 'Đến ngày',
  filterApply: 'Lọc',
  advancedSearch: 'Tìm nâng cao',
  clearFilters: 'Xoá tất cả bộ lọc',
  noScenario: 'Không có kịch bản',

  // Advanced search
  advSearchTitle: 'Tìm kiếm nâng cao',
  advSearchAdd: 'Thêm điều kiện',
  advSearchApply: 'Áp dụng',
  advSearchClear: 'Xoá bộ lọc nâng cao',
  advFieldName: 'Họ tên',
  advFieldCccd: 'CCCD',
  advFieldCode: 'Mã hồ sơ',
  advFieldPhone: 'SĐT',
  advFieldAddress: 'Địa chỉ',
  advFieldArea: 'Địa bàn',
  advFieldStatus: 'Trạng thái',
  advFieldDate: 'Ngày tạo',
  advOpContains: 'chứa',
  advOpEquals: 'bằng',
  advOpNotEquals: 'khác',
  advOpAfter: 'sau',
  advOpBefore: 'trước',
  advPlaceholder: 'Nhập giá trị...',

  // Table headers
  colCheckbox: 'Chọn tất cả',
  colMaHoSo: 'MÃ HỒ SƠ',
  colFullName: 'HỌ TÊN',
  colCccd: 'CCCD',
  colAddress: 'ĐỊA CHỈ',
  colScenario: 'KỊCH BẢN',
  colStatus: 'TRẠNG THÁI',
  colCreatedAt: 'NGÀY TẠO',
  colActions: '',

  // Status labels
  statusInit: 'Khởi tạo',
  statusEnrolled: 'Đã đăng ký',
  statusActive: 'Đang quản lý',
  statusReintegrate: 'Tái hòa nhập',
  statusEnded: 'Kết thúc',

  // Actions
  view: 'Xem',
  edit: 'Sửa',

  // Pagination
  paginationInfo: (from: number, to: number, total: number) =>
    `Hiển thị ${from}–${to} trên ${total} kết quả`,

  // Empty states
  emptyTitle: 'Chưa có hồ sơ nào',
  emptySubtitle: 'Nhấn "Thêm hồ sơ" để bắt đầu quản lý',
  noResultsTitle: 'Không tìm thấy kết quả',
  noResultsSubtitle: 'Thử thay đổi bộ lọc hoặc từ khoá',

  // Errors
  errLoad: 'Lỗi tải dữ liệu',
  errLoadRetry: 'Lỗi tải dữ liệu. Nhấn "Thử lại" để tải lại.',
  errForbidden: 'Bạn không có quyền xem danh sách hồ sơ.',
  errBadRequest: 'Tham số tìm kiếm không hợp lệ.',
  errRateLimit: 'Quá nhiều yêu cầu. Vui lòng đợi ít phút.',
  errSystem: 'Lỗi hệ thống. Vui lòng thử lại sau.',
  errExport: 'Không thể xuất file với bộ lọc hiện tại.',
  retry: 'Thử lại',

  // Export
  exportSuccess: 'Xuất file thành công.',
  exporting: 'Đang xuất file...',

  // Bulk actions
  selectedCount: (n: number) => `Đã chọn ${n} hồ sơ`,
  bulkAssign: 'Gán kịch bản',
  bulkExport: 'Xuất',

  // No data placeholder
  noScenarioAssigned: '—',

  // ========== SCR-021: Detail ==========
  detailTitle: 'Chi tiết hồ sơ',
  detailDocTitle: 'Chi tiết hồ sơ — SMTTS',
  editBtn: 'Chỉnh sửa',
  assignScenario: 'Gán kịch bản',

  // Detail tabs
  tabInfo: 'Thông tin',
  tabScenario: 'Kịch bản',
  tabTimeline: 'Timeline',
  tabDocuments: 'Tài liệu',
  tabDevices: 'Thiết bị',
  tabEnrollment: 'Enrollment',

  // Info tab labels
  lblFullName: 'Họ tên',
  lblCccd: 'CCCD',
  lblDob: 'Ngày sinh',
  lblGender: 'Giới tính',
  lblPhone: 'SĐT',
  lblAddress: 'Địa chỉ',
  lblArea: 'Nơi ĐKQL',
  lblOfficer: 'Cán bộ phụ trách',
  lblStatus: 'Trạng thái',
  genderMale: 'Nam',
  genderFemale: 'Nữ',

  // Family card
  cardFamily: 'Gia đình',
  lblFather: 'Cha',
  lblMother: 'Mẹ',
  lblSpouse: 'Vợ/Chồng',
  lblFamilyNotes: 'Ghi chú GĐ',

  // Legal card
  cardLegal: 'Pháp lý',
  lblDecisionNo: 'Số bản án',
  lblDecisionDate: 'Ngày QD',
  lblMgmtType: 'Loại QL',
  lblStartDate: 'Bắt đầu QL',
  lblEndDate: 'Kết thúc QL',
  lblAuthority: 'Cơ quan',
  lblLegalNotes: 'Ghi chú PL',

  // Scenario tab
  cardScenarioActive: 'Kịch bản đang áp dụng',
  lblScenarioName: 'Tên KB',
  lblAssignedAt: 'Ngày gán',
  lblCheckinFreq: 'Tần suất',
  noScenarioTitle: 'Chưa gán kịch bản',
  noScenarioSub: 'Gán kịch bản để bắt đầu quản lý đối tượng',

  // Timeline tab
  noTimelineTitle: 'Chưa có sự kiện nào',
  noTimelineSub: 'Lịch sử hoạt động sẽ xuất hiện tại đây',

  // Documents tab
  cardDocuments: 'Tài liệu đính kèm',
  noDocsTitle: 'Chưa có tài liệu',
  noDocsSub: 'Upload bản án, quyết định hoặc tài liệu liên quan',

  // Devices tab
  cardDeviceCurrent: 'Thiết bị đang gắn',
  cardDeviceHistory: 'Lịch sử thiết bị',
  noDeviceTitle: 'Chưa gắn thiết bị',
  noDeviceSub: 'Thiết bị sẽ được gắn sau khi hoàn thành Enrollment',
  lblDeviceId: 'Device ID',
  lblModel: 'Model',
  lblOs: 'OS',
  lblBindDate: 'Ngày gắn',

  // Enrollment tab
  cardEnrollment: 'Thông tin Enrollment',
  noEnrollTitle: 'Chưa enrollment',
  noEnrollSub: 'Đối tượng cần hoàn thành enrollment với cán bộ',

  // ========== SCR-022: Create ==========
  createTitle: 'Thêm hồ sơ mới',
  createDocTitle: 'Thêm hồ sơ mới — SMTTS',
  breadcrumbCreate: 'Thêm hồ sơ mới',
  cardPersonal: 'Thông tin nhân thân',
  cardFamilyForm: 'Thông tin gia đình',
  cardLegalForm: 'Thông tin pháp lý',
  cardNotes: 'Ghi chú',
  btnCancel: 'Huỷ bỏ',
  btnSave: 'Lưu hồ sơ',
  btnSaving: 'Đang lưu...',
  createSuccess: 'Tạo hồ sơ thành công',
  createError: 'Lỗi tạo hồ sơ',
  cccdExists: 'Số CCCD đã tồn tại trong hệ thống',

  // Form placeholders
  phFullName: 'Nhập họ và tên đầy đủ',
  phCccd: 'Nhập 12 chữ số',
  phDob: 'DD/MM/YYYY',
  phGender: 'Chọn giới tính',
  phPhone: '0xxx xxx xxx',
  phArea: 'Tìm và chọn đơn vị...',
  phAddress: 'Nhập địa chỉ cư trú hiện tại',
  phFamilyName: 'Nhập họ tên',
  phFamilyPhone: '0xxx xxx xxx',
  phFamilyAddress: 'Nhập địa chỉ gia đình',
  phFamilyNotes: 'Thông tin bổ sung về hoàn cảnh gia đình...',
  phLegalDocNo: 'VD: 45/2024/HS-ST',
  phLegalAuth: 'VD: TAND Quận 1, TP.HCM',
  phLegalDuration: 'VD: Quản chế, Cải tạo...',
  phLegalReason: 'Mô tả tội danh hoặc lý do...',
  phNotes: 'Nhập ghi chú bổ sung...',

  // Form labels
  lblFamilyContact: 'Họ tên cha/mẹ hoặc người bảo hộ',
  lblFamilyPhone: 'SĐT người thân',
  lblFamilyAddr: 'Địa chỉ gia đình',
  lblFamilyNotesForm: 'Ghi chú về gia đình',
  lblLegalDocNo: 'Số bản án / Quyết định',
  lblLegalDate: 'Ngày ra quyết định',
  lblLegalAuth: 'Cơ quan ra quyết định',
  lblLegalDuration: 'Hình thức quản lý',
  lblLegalStartDate: 'Ngày bắt đầu quản lý',
  lblLegalEndDate: 'Ngày kết thúc quản lý',
  lblLegalReason: 'Tội danh / Lý do quản lý',
  lblNotesForm: 'Ghi chú',

  // Validation
  valRequired: 'Trường này là bắt buộc',
  valNameMin: 'Tối thiểu 2 ký tự',
  valNameMax: 'Tối đa 200 ký tự',
  valCccd12: 'CCCD phải gồm 12 chữ số',
  valPhoneFormat: 'SĐT phải gồm 10 chữ số, bắt đầu bằng 0',
  valSelectGender: 'Vui lòng chọn giới tính',
  valSelectArea: 'Vui lòng chọn nơi đăng ký quản lý',

  // ========== SCR-023: Edit ==========
  editTitle: 'Chỉnh sửa hồ sơ',
  editDocTitle: 'Chỉnh sửa hồ sơ — SMTTS',
  breadcrumbEdit: 'Chỉnh sửa',
  btnUpdate: 'Lưu thay đổi',
  btnUpdating: 'Đang lưu...',
  updateSuccess: 'Lưu hồ sơ thành công',
  updateError: 'Lỗi cập nhật hồ sơ',
  cccdReadonly: 'CCCD không thể thay đổi sau khi tạo hồ sơ',
  noChanges: 'Chưa có thay đổi nào',

  // ========== SCR-024: Enrollment ==========
  enrollTitle: 'Quản lý Enrollment',
  enrollDocTitle: 'Quản lý Enrollment — SMTTS',
  breadcrumbEnrollment: 'Quản lý Enrollment',
  statTotal: 'Tổng enrollment',
  statPending: 'Chờ xác nhận',
  statCompleted: 'Hoàn thành',
  statDeviceChange: 'Đổi TB chờ duyệt',
  tabEnrollList: 'Danh sách Enrollment',
  tabDeviceRequests: 'Yêu cầu đổi TB',
  enrollEmpty: 'Chưa có enrollment nào',
  deviceReqEmpty: 'Không có yêu cầu đổi thiết bị',
  colSubjectCode: 'MÃ HS',
  colDevice: 'THIẾT BỊ',
  colEnrollDate: 'NGÀY ENROLL',
  enrollPending: 'Chờ xác nhận',
  enrollCompleted: 'Hoàn thành',
  enrollInProgress: 'Đang tiến hành',
  enrollFailed: 'Thất bại',
  confirm: 'Xác nhận',
  reject: 'Từ chối',
  approve: 'Duyệt',
  reset: 'Reset',
} as const;

export default subjects;
