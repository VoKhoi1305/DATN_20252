const requests = {
  documentTitle: 'Quản lý yêu cầu | SMTTS',
  pageTitle: 'Quản lý yêu cầu',
  back: 'Quay lại',

  // Filter tabs
  filterAll: 'Tất cả',
  filterPending: 'Chờ duyệt',
  filterApproved: 'Đã duyệt',
  filterRejected: 'Đã từ chối',

  // Search
  searchPlaceholder: 'Tìm theo CCCD hoặc tên đối tượng...',

  // Table columns
  colCode: 'Mã yêu cầu',
  colSubject: 'Đối tượng',
  colCccd: 'CCCD',
  colType: 'Loại yêu cầu',
  colStatus: 'Trạng thái',
  colCreatedAt: 'Ngày tạo',
  colActions: 'Thao tác',

  // Request types
  typeTRAVEL: 'Xin đi xa',
  typePOSTPONE: 'Xin hoãn',
  typeCHANGE_DEVICE: 'Đổi thiết bị',
  typeCHANGE_ADDRESS: 'Đổi địa chỉ',

  // Status
  statusPENDING: 'Chờ duyệt',
  statusAPPROVED: 'Đã duyệt',
  statusREJECTED: 'Đã từ chối',

  // Detail view
  detailTitle: 'Chi tiết yêu cầu',
  detailSubject: 'Đối tượng',
  detailCccd: 'Số CCCD',
  detailType: 'Loại yêu cầu',
  detailReason: 'Lý do',
  detailDetails: 'Thông tin bổ sung',
  detailStatus: 'Trạng thái',
  detailCreatedAt: 'Ngày tạo',
  detailReviewedBy: 'Người duyệt',
  detailReviewedAt: 'Ngày duyệt',
  detailReviewNote: 'Ghi chú duyệt',

  // Type-specific detail labels
  lblDestination: 'Nơi đến',
  lblDateFrom: 'Ngày đi',
  lblDateTo: 'Ngày về',
  lblPostponeDate: 'Ngày xin hoãn',
  lblNewAddress: 'Địa chỉ mới',
  lblNewDevice: 'Thiết bị mới',
  sectionRequestInfo: 'Thông tin yêu cầu',
  sectionSubjectInfo: 'Thông tin đối tượng',
  sectionReviewInfo: 'Thông tin duyệt',

  // Actions
  approve: 'Phê duyệt',
  reject: 'Từ chối',
  viewDetail: 'Xem chi tiết',

  // Dialog
  dlgApproveTitle: 'Xác nhận phê duyệt',
  dlgRejectTitle: 'Xác nhận từ chối',
  dlgApproveHint: 'Ghi chú phê duyệt (không bắt buộc)',
  dlgRejectHint: 'Lý do từ chối (bắt buộc)',
  dlgNoteLabel: 'Ghi chú',
  dlgCancel: 'Huỷ',

  // Toast messages
  msgApproveSuccess: 'Đã phê duyệt yêu cầu thành công',
  msgRejectSuccess: 'Đã từ chối yêu cầu',
  msgError: 'Có lỗi xảy ra, vui lòng thử lại',
  msgNoteRequired: 'Vui lòng nhập lý do từ chối',

  // Empty state
  emptyTitle: 'Không có yêu cầu nào',
  emptySubtitle: 'Khi đối tượng gửi yêu cầu, chúng sẽ xuất hiện tại đây',
  emptyFilterTitle: 'Không tìm thấy yêu cầu',
  emptyFilterSubtitle: 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm',
} as const;

export default requests;
