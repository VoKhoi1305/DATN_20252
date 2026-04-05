const enrollmentApprovals = {
  documentTitle: 'Duyệt đăng ký sinh trắc | SMTTS',
  pageTitle: 'Duyệt đăng ký sinh trắc học',
  back: 'Quay lại',

  // Table columns
  colCode: 'Mã hồ sơ',
  colName: 'Họ và tên',
  colSubmittedAt: 'Ngày gửi',
  colActions: 'Thao tác',

  // Actions
  approve: 'Phê duyệt',
  reject: 'Từ chối',

  // Dialog
  dlgApproveTitle: 'Xác nhận phê duyệt',
  dlgRejectTitle: 'Xác nhận từ chối',
  dlgApproveHint: 'Ghi chú phê duyệt (không bắt buộc)',
  dlgRejectHint: 'Lý do từ chối (bắt buộc)',
  dlgNoteLabel: 'Ghi chú',
  dlgCancel: 'Huỷ',

  // Toast
  msgApproveSuccess: 'Đã phê duyệt thành công',
  msgRejectSuccess: 'Đã từ chối hồ sơ',
  msgError: 'Có lỗi xảy ra, vui lòng thử lại',
  msgNoteRequired: 'Vui lòng nhập lý do từ chối',

  // Empty state
  emptyTitle: 'Không có hồ sơ chờ duyệt',
  emptySubtitle: 'Khi đối tượng hoàn thành đăng ký sinh trắc, hồ sơ sẽ xuất hiện tại đây',

  // Status
  statusPending: 'Chờ duyệt',
} as const;

export default enrollmentApprovals;
