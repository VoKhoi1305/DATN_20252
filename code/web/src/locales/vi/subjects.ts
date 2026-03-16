const subjects = {
  // Page
  pageTitle: 'H\u1ED3 s\u01A1 \u0111\u1ED1i t\u01B0\u1EE3ng',
  documentTitle: 'H\u1ED3 s\u01A1 \u0111\u1ED1i t\u01B0\u1EE3ng \u2014 SMTTS',
  breadcrumbDashboard: 'Dashboard',
  breadcrumbProfiles: 'H\u1ED3 s\u01A1 \u0111\u1ED1i t\u01B0\u1EE3ng',

  // Subtitle
  subtitleCount: (n: number) => `${n} \u0111\u1ED1i t\u01B0\u1EE3ng \u0111ang qu\u1EA3n l\u00FD`,

  // Actions
  addProfile: 'Th\u00EAm h\u1ED3 s\u01A1',
  exportExcel: 'Xu\u1EA5t Excel',

  // Filter bar
  searchPlaceholder: 'T\u00ECm t\u00EAn, CCCD...',
  filterStatus: 'Tr\u1EA1ng th\u00E1i',
  filterScenario: 'K\u1ECBch b\u1EA3n',
  filterAll: 'T\u1EA5t c\u1EA3',
  filterDateFrom: 'T\u1EEB ng\u00E0y',
  filterDateTo: '\u0110\u1EBFn ng\u00E0y',
  filterApply: 'L\u1ECDc',
  advancedSearch: 'T\u00ECm n\u00E2ng cao',
  clearFilters: 'Xo\u00E1 t\u1EA5t c\u1EA3 b\u1ED9 l\u1ECDc',
  noScenario: 'Kh\u00F4ng c\u00F3 k\u1ECBch b\u1EA3n',

  // Table headers
  colCheckbox: 'Ch\u1ECDn t\u1EA5t c\u1EA3',
  colMaHoSo: 'M\u00C3 H\u1ED2 S\u01A0',
  colFullName: 'H\u1ECC T\u00CAN',
  colCccd: 'CCCD',
  colAddress: '\u0110\u1ECAA CH\u1EC8',
  colScenario: 'K\u1ECACH B\u1EA2N',
  colStatus: 'TR\u1EA0NG TH\u00C1I',
  colCreatedAt: 'NG\u00C0Y T\u1EA0O',
  colActions: '',

  // Status labels
  statusInit: 'Kh\u1EDFi t\u1EA1o',
  statusEnrolled: '\u0110\u00E3 \u0111\u0103ng k\u00FD',
  statusActive: '\u0110ang qu\u1EA3n l\u00FD',
  statusReintegrate: 'T\u00E1i h\u00F2a nh\u1EADp',
  statusEnded: 'K\u1EBFt th\u00FAc',

  // Actions
  view: 'Xem',
  edit: 'S\u1EEDa',

  // Pagination
  paginationInfo: (from: number, to: number, total: number) =>
    `Hi\u1EC3n th\u1ECB ${from}\u2013${to} tr\u00EAn ${total} k\u1EBFt qu\u1EA3`,

  // Empty states
  emptyTitle: 'Ch\u01B0a c\u00F3 h\u1ED3 s\u01A1 n\u00E0o',
  emptySubtitle: 'Nh\u1EA5n "Th\u00EAm h\u1ED3 s\u01A1" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u qu\u1EA3n l\u00FD',
  noResultsTitle: 'Kh\u00F4ng t\u00ECm th\u1EA5y k\u1EBFt qu\u1EA3',
  noResultsSubtitle: 'Th\u1EED thay \u0111\u1ED5i b\u1ED9 l\u1ECDc ho\u1EB7c t\u1EEB kho\u00E1',

  // Errors
  errLoad: 'L\u1ED7i t\u1EA3i d\u1EEF li\u1EC7u',
  errLoadRetry: 'L\u1ED7i t\u1EA3i d\u1EEF li\u1EC7u. Nh\u1EA5n "Th\u1EED l\u1EA1i" \u0111\u1EC3 t\u1EA3i l\u1EA1i.',
  errForbidden: 'B\u1EA1n kh\u00F4ng c\u00F3 quy\u1EC1n xem danh s\u00E1ch h\u1ED3 s\u01A1.',
  errBadRequest: 'Tham s\u1ED1 t\u00ECm ki\u1EBFm kh\u00F4ng h\u1EE3p l\u1EC7.',
  errRateLimit: 'Qu\u00E1 nhi\u1EC1u y\u00EAu c\u1EA7u. Vui l\u00F2ng \u0111\u1EE3i \u00EDt ph\u00FAt.',
  errSystem: 'L\u1ED7i h\u1EC7 th\u1ED1ng. Vui l\u00F2ng th\u1EED l\u1EA1i sau.',
  errExport: 'Kh\u00F4ng th\u1EC3 xu\u1EA5t file v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i.',
  retry: 'Th\u1EED l\u1EA1i',

  // Export
  exportSuccess: 'Xu\u1EA5t file th\u00E0nh c\u00F4ng.',
  exporting: '\u0110ang xu\u1EA5t file...',

  // Bulk actions
  selectedCount: (n: number) => `\u0110\u00E3 ch\u1ECDn ${n} h\u1ED3 s\u01A1`,
  bulkAssign: 'G\u00E1n k\u1ECBch b\u1EA3n',
  bulkExport: 'Xu\u1EA5t',

  // No data placeholder
  noScenarioAssigned: '\u2014',

  // ========== SCR-021: Detail ==========
  detailTitle: 'Chi ti\u1EBFt h\u1ED3 s\u01A1',
  detailDocTitle: 'Chi ti\u1EBFt h\u1ED3 s\u01A1 \u2014 SMTTS',
  editBtn: 'Ch\u1EC9nh s\u1EEDa',
  assignScenario: 'G\u00E1n k\u1ECBch b\u1EA3n',

  // Detail tabs
  tabInfo: 'Th\u00F4ng tin',
  tabScenario: 'K\u1ECBch b\u1EA3n',
  tabTimeline: 'Timeline',
  tabDocuments: 'T\u00E0i li\u1EC7u',
  tabDevices: 'Thi\u1EBFt b\u1ECB',
  tabEnrollment: 'Enrollment',

  // Info tab labels
  lblFullName: 'H\u1ECD t\u00EAn',
  lblCccd: 'CCCD',
  lblDob: 'Ng\u00E0y sinh',
  lblGender: 'Gi\u1EDBi t\u00EDnh',
  lblPhone: 'S\u0110T',
  lblAddress: '\u0110\u1ECBa ch\u1EC9',
  lblArea: 'N\u01A1i \u0110KQL',
  lblOfficer: 'C\u00E1n b\u1ED9 ph\u1EE5 tr\u00E1ch',
  lblStatus: 'Tr\u1EA1ng th\u00E1i',
  genderMale: 'Nam',
  genderFemale: 'N\u1EEF',

  // Family card
  cardFamily: 'Gia \u0111\u00ECnh',
  lblFather: 'Cha',
  lblMother: 'M\u1EB9',
  lblSpouse: 'V\u1EE3/Ch\u1ED3ng',
  lblFamilyNotes: 'Ghi ch\u00FA G\u0110',

  // Legal card
  cardLegal: 'Ph\u00E1p l\u00FD',
  lblDecisionNo: 'S\u1ED1 b\u1EA3n \u00E1n',
  lblDecisionDate: 'Ng\u00E0y QD',
  lblMgmtType: 'Lo\u1EA1i QL',
  lblStartDate: 'B\u1EAFt \u0111\u1EA7u QL',
  lblEndDate: 'K\u1EBFt th\u00FAc QL',
  lblAuthority: 'C\u01A1 quan',
  lblLegalNotes: 'Ghi ch\u00FA PL',

  // Scenario tab
  cardScenarioActive: 'K\u1ECBch b\u1EA3n \u0111ang \u00E1p d\u1EE5ng',
  lblScenarioName: 'T\u00EAn KB',
  lblAssignedAt: 'Ng\u00E0y g\u00E1n',
  lblCheckinFreq: 'T\u1EA7n su\u1EA5t',
  noScenarioTitle: 'Ch\u01B0a g\u00E1n k\u1ECBch b\u1EA3n',
  noScenarioSub: 'G\u00E1n k\u1ECBch b\u1EA3n \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u qu\u1EA3n l\u00FD \u0111\u1ED1i t\u01B0\u1EE3ng',

  // Timeline tab
  noTimelineTitle: 'Ch\u01B0a c\u00F3 s\u1EF1 ki\u1EC7n n\u00E0o',
  noTimelineSub: 'L\u1ECBch s\u1EED ho\u1EA1t \u0111\u1ED9ng s\u1EBD xu\u1EA5t hi\u1EC7n t\u1EA1i \u0111\u00E2y',

  // Documents tab
  cardDocuments: 'T\u00E0i li\u1EC7u \u0111\u00EDnh k\u00E8m',
  noDocsTitle: 'Ch\u01B0a c\u00F3 t\u00E0i li\u1EC7u',
  noDocsSub: 'Upload b\u1EA3n \u00E1n, quy\u1EBFt \u0111\u1ECBnh ho\u1EB7c t\u00E0i li\u1EC7u li\u00EAn quan',

  // Devices tab
  cardDeviceCurrent: 'Thi\u1EBFt b\u1ECB \u0111ang g\u1EAFn',
  cardDeviceHistory: 'L\u1ECBch s\u1EED thi\u1EBFt b\u1ECB',
  noDeviceTitle: 'Ch\u01B0a g\u1EAFn thi\u1EBFt b\u1ECB',
  noDeviceSub: 'Thi\u1EBFt b\u1ECB s\u1EBD \u0111\u01B0\u1EE3c g\u1EAFn sau khi ho\u00E0n th\u00E0nh Enrollment',
  lblDeviceId: 'Device ID',
  lblModel: 'Model',
  lblOs: 'OS',
  lblBindDate: 'Ng\u00E0y g\u1EAFn',

  // Enrollment tab
  cardEnrollment: 'Th\u00F4ng tin Enrollment',
  noEnrollTitle: 'Ch\u01B0a enrollment',
  noEnrollSub: '\u0110\u1ED1i t\u01B0\u1EE3ng c\u1EA7n ho\u00E0n th\u00E0nh enrollment v\u1EDBi c\u00E1n b\u1ED9',

  // ========== SCR-022: Create ==========
  createTitle: 'Th\u00EAm h\u1ED3 s\u01A1 m\u1EDBi',
  createDocTitle: 'Th\u00EAm h\u1ED3 s\u01A1 m\u1EDBi \u2014 SMTTS',
  breadcrumbCreate: 'Th\u00EAm h\u1ED3 s\u01A1 m\u1EDBi',
  cardPersonal: 'Th\u00F4ng tin nh\u00E2n th\u00E2n',
  cardFamilyForm: 'Th\u00F4ng tin gia \u0111\u00ECnh',
  cardLegalForm: 'Th\u00F4ng tin ph\u00E1p l\u00FD',
  cardNotes: 'Ghi ch\u00FA',
  btnCancel: 'Hu\u1EF7 b\u1ECF',
  btnSave: 'L\u01B0u h\u1ED3 s\u01A1',
  btnSaving: '\u0110ang l\u01B0u...',
  createSuccess: 'T\u1EA1o h\u1ED3 s\u01A1 th\u00E0nh c\u00F4ng',
  createError: 'L\u1ED7i t\u1EA1o h\u1ED3 s\u01A1',
  cccdExists: 'S\u1ED1 CCCD \u0111\u00E3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng',

  // Form placeholders
  phFullName: 'Nh\u1EADp h\u1ECD v\u00E0 t\u00EAn \u0111\u1EA7y \u0111\u1EE7',
  phCccd: 'Nh\u1EADp 12 ch\u1EEF s\u1ED1',
  phDob: 'DD/MM/YYYY',
  phGender: 'Ch\u1ECDn gi\u1EDBi t\u00EDnh',
  phPhone: '0xxx xxx xxx',
  phArea: 'T\u00ECm v\u00E0 ch\u1ECDn \u0111\u01A1n v\u1ECB...',
  phAddress: 'Nh\u1EADp \u0111\u1ECBa ch\u1EC9 c\u01B0 tr\u00FA hi\u1EC7n t\u1EA1i',
  phFamilyName: 'Nh\u1EADp h\u1ECD t\u00EAn',
  phFamilyPhone: '0xxx xxx xxx',
  phFamilyAddress: 'Nh\u1EADp \u0111\u1ECBa ch\u1EC9 gia \u0111\u00ECnh',
  phFamilyNotes: 'Th\u00F4ng tin b\u1ED5 sung v\u1EC1 ho\u00E0n c\u1EA3nh gia \u0111\u00ECnh...',
  phLegalDocNo: 'VD: 45/2024/HS-ST',
  phLegalAuth: 'VD: TAND Qu\u1EADn 1, TP.HCM',
  phLegalDuration: 'VD: 24 th\u00E1ng',
  phLegalReason: 'M\u00F4 t\u1EA3 t\u1ED9i danh ho\u1EB7c l\u00FD do...',
  phNotes: 'Nh\u1EADp ghi ch\u00FA b\u1ED5 sung...',

  // Form labels
  lblFamilyContact: 'H\u1ECD t\u00EAn cha/m\u1EB9 ho\u1EB7c ng\u01B0\u1EDDi b\u1EA3o h\u1ED9',
  lblFamilyPhone: 'S\u0110T ng\u01B0\u1EDDi th\u00E2n',
  lblFamilyAddr: '\u0110\u1ECBa ch\u1EC9 gia \u0111\u00ECnh',
  lblFamilyNotesForm: 'Ghi ch\u00FA v\u1EC1 gia \u0111\u00ECnh',
  lblLegalDocNo: 'S\u1ED1 b\u1EA3n \u00E1n / Quy\u1EBFt \u0111\u1ECBnh',
  lblLegalDate: 'Ng\u00E0y ra quy\u1EBFt \u0111\u1ECBnh',
  lblLegalAuth: 'C\u01A1 quan ra quy\u1EBFt \u0111\u1ECBnh',
  lblLegalDuration: 'Th\u1EDDi h\u1EA1n qu\u1EA3n l\u00FD',
  lblLegalReason: 'T\u1ED9i danh / L\u00FD do qu\u1EA3n l\u00FD',
  lblNotesForm: 'Ghi ch\u00FA',

  // Validation
  valRequired: 'Tr\u01B0\u1EDDng n\u00E0y l\u00E0 b\u1EAFt bu\u1ED9c',
  valNameMin: 'T\u1ED1i thi\u1EC3u 2 k\u00FD t\u1EF1',
  valNameMax: 'T\u1ED1i \u0111a 200 k\u00FD t\u1EF1',
  valCccd12: 'CCCD ph\u1EA3i g\u1ED3m 12 ch\u1EEF s\u1ED1',
  valPhoneFormat: 'S\u0110T ph\u1EA3i g\u1ED3m 10 ch\u1EEF s\u1ED1, b\u1EAFt \u0111\u1EA7u b\u1EB1ng 0',
  valSelectGender: 'Vui l\u00F2ng ch\u1ECDn gi\u1EDBi t\u00EDnh',
  valSelectArea: 'Vui l\u00F2ng ch\u1ECDn n\u01A1i \u0111\u0103ng k\u00FD qu\u1EA3n l\u00FD',

  // ========== SCR-023: Edit ==========
  editTitle: 'Ch\u1EC9nh s\u1EEDa h\u1ED3 s\u01A1',
  editDocTitle: 'Ch\u1EC9nh s\u1EEDa h\u1ED3 s\u01A1 \u2014 SMTTS',
  breadcrumbEdit: 'Ch\u1EC9nh s\u1EEDa',
  btnUpdate: 'L\u01B0u thay \u0111\u1ED5i',
  btnUpdating: '\u0110ang l\u01B0u...',
  updateSuccess: 'L\u01B0u h\u1ED3 s\u01A1 th\u00E0nh c\u00F4ng',
  updateError: 'L\u1ED7i c\u1EADp nh\u1EADt h\u1ED3 s\u01A1',
  cccdReadonly: 'CCCD kh\u00F4ng th\u1EC3 thay \u0111\u1ED5i sau khi t\u1EA1o h\u1ED3 s\u01A1',
  noChanges: 'Ch\u01B0a c\u00F3 thay \u0111\u1ED5i n\u00E0o',

  // ========== SCR-024: Enrollment ==========
  enrollTitle: 'Qu\u1EA3n l\u00FD Enrollment',
  enrollDocTitle: 'Qu\u1EA3n l\u00FD Enrollment \u2014 SMTTS',
  breadcrumbEnrollment: 'Qu\u1EA3n l\u00FD Enrollment',
  statTotal: 'T\u1ED5ng enrollment',
  statPending: 'Ch\u1EDD x\u00E1c nh\u1EADn',
  statCompleted: 'Ho\u00E0n th\u00E0nh',
  statDeviceChange: '\u0110\u1ED5i TB ch\u1EDD duy\u1EC7t',
  tabEnrollList: 'Danh s\u00E1ch Enrollment',
  tabDeviceRequests: 'Y\u00EAu c\u1EA7u \u0111\u1ED5i TB',
  enrollEmpty: 'Ch\u01B0a c\u00F3 enrollment n\u00E0o',
  deviceReqEmpty: 'Kh\u00F4ng c\u00F3 y\u00EAu c\u1EA7u \u0111\u1ED5i thi\u1EBFt b\u1ECB',
  colSubjectCode: 'M\u00C3 HS',
  colDevice: 'THI\u1EBET B\u1ECA',
  colEnrollDate: 'NG\u00C0Y ENROLL',
  enrollPending: 'Ch\u1EDD x\u00E1c nh\u1EADn',
  enrollCompleted: 'Ho\u00E0n th\u00E0nh',
  enrollInProgress: '\u0110ang ti\u1EBFn h\u00E0nh',
  enrollFailed: 'Th\u1EA5t b\u1EA1i',
  confirm: 'X\u00E1c nh\u1EADn',
  reject: 'T\u1EEB ch\u1ED1i',
  approve: 'Duy\u1EC7t',
  reset: 'Reset',
} as const;

export default subjects;
