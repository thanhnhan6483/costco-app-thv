import { Department, Shift, LeaveType, SpecialGroup, Employee, AllocRule } from '@/types';

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'd_BB',   code: 'BB',   name: 'BÁNH BẮP',          active: true },
  { id: 'd_BI',   code: 'BI',   name: 'BÁNH IN',            active: true },
  { id: 'd_BBK',  code: 'BBK',  name: 'BAO BÌ KẸO',         active: true },
  { id: 'd_BBL',  code: 'BBL',  name: 'BAO BÌ LỚN',         active: true },
  { id: 'd_BBN',  code: 'BBN',  name: 'BAO BÌ NHỎ',         active: true },
  { id: 'd_BV',   code: 'BV',   name: 'BẢO VỆ',             active: true },
  { id: 'd_CN',   code: 'CN',   name: 'CHI NHÁNH',          active: true },
  { id: 'd_CD',   code: 'CĐ',   name: 'CƠ ĐIỆN',            active: true },
  { id: 'd_CK',   code: 'CK',   name: 'CƠ KHÍ',             active: true },
  { id: 'd_CNTT', code: 'CNTT', name: 'CÔNG NGHỆ THÔNG TIN',active: true },
  { id: 'd_CH',   code: 'CH',   name: 'CỬA HÀNG',           active: true },
  { id: 'd_HN',   code: 'HN',   name: 'HẠNH NHÂN',          active: true },
  { id: 'd_KT',   code: 'KT',   name: 'KẾ TOÁN',            active: true },
  { id: 'd_K',    code: 'K',    name: 'KHÂU KẸO',           active: true },
  { id: 'd_KNL',  code: 'KNL',  name: 'KHO NGUYÊN LIỆU',   active: true },
  { id: 'd_KTP',  code: 'KTP',  name: 'KHO THÀNH PHẨM',    active: true },
  { id: 'd_KD',   code: 'KD',   name: 'KINH DOANH',          active: true },
  { id: 'd_KTH',  code: 'KTH',  name: 'KỸ THUẬT',           active: true },
  { id: 'd_LX',   code: 'LX',   name: 'LẠP XƯỞNG',          active: true },
  { id: 'd_LCH',  code: 'LCH',  name: 'LÒ CHAY',            active: true },
  { id: 'd_LN',   code: 'LN',   name: 'LÒ MẶN',             active: true },
  { id: 'd_LC',   code: 'LC',   name: 'LONG CHÂU',          active: true },
  { id: 'd_NB',   code: 'NB',   name: 'NHÀ BẾP',            active: true },
  { id: 'd_NH',   code: 'NH',   name: 'NHÀ HÀNG',           active: true },
  { id: 'd_NS',   code: 'NS',   name: 'NHÂN SỰ',            active: true },
  { id: 'd_PC',   code: 'PC',   name: 'PÍA CHAY',           active: true },
  { id: 'd_PM',   code: 'PM',   name: 'PÍA MẶN',            active: true },
  { id: 'd_QD1',  code: 'QĐ1',  name: 'QUẬY ĐẬU 1',        active: true },
  { id: 'd_QD2',  code: 'QĐ2',  name: 'QUẬY ĐẬU 2',        active: true },
  { id: 'd_SR',   code: 'SR',   name: 'SẦU RIÊNG',          active: true },
  { id: 'd_TX',   code: 'TX',   name: 'TÀI XẾ',             active: true },
  { id: 'd_TH',   code: 'TH',   name: 'TỔNG HỢP',           active: true },
  { id: 'd_TV',   code: 'TV',   name: 'TRỨNG VỊT',          active: true },
  { id: 'd_VS',   code: 'VS',   name: 'VỆ SINH',            active: true },
  { id: 'd_BGD',  code: 'BGĐ',  name: 'BAN GIÁM ĐỐC',       active: true },
];

export const DEFAULT_SHIFTS: Shift[] = [
  { id: 's_BB1',   code: 'CA1', name: 'Ca 16h30',   departments: ['BB'],   startTime: '07:30', endTime: '16:30', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_BV1',   code: 'CA1', name: '2 CA BV',    departments: ['BV'],   startTime: '06:00', endTime: '14:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_BV2',   code: 'CA2', name: '2 CA BV',    departments: ['BV'],   startTime: '10:00', endTime: '18:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_CD1',   code: 'CA1', name: 'Ca 17h',     departments: ['CĐ'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_CH1',   code: 'CA1', name: '2 CA CH/NH', departments: ['CH'],   startTime: '06:30', endTime: '14:30', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_CH2',   code: 'CA2', name: '2 CA CH/NH', departments: ['CH'],   startTime: '12:00', endTime: '20:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_CN1',   code: 'CA1', name: 'Ca 17h',     departments: ['CN'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_CK1',   code: 'CA1', name: 'Ca 17h',     departments: ['CK'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_CNTT1', code: 'CA1', name: 'Ca 17h',     departments: ['CNTT'], startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_KD1',   code: 'CA1', name: 'Ca 17h',     departments: ['KD'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_KT1',   code: 'CA1', name: 'Ca 17h',     departments: ['KT'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_KTP1',  code: 'CA1', name: 'Ca 17h',     departments: ['KTP'],  startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_NB1',   code: 'CA1', name: 'CA 8/CA HC', departments: ['NB'],   startTime: '07:30', endTime: '16:30', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_NH1',   code: 'CA1', name: '2 CA CH/NH', departments: ['NH'],   startTime: '06:30', endTime: '14:30', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_NH2',   code: 'CA2', name: '2 CA CH/NH', departments: ['NH'],   startTime: '12:00', endTime: '20:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_TH1',   code: 'CA1', name: 'Ca 17h',     departments: ['TH'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_TX1',   code: 'CA1', name: 'Ca 17h',     departments: ['TX'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
  { id: 's_VS1',   code: 'CA1', name: 'Ca 17h',     departments: ['VS'],   startTime: '07:30', endTime: '17:00', lateToleranceMin: 0, earlyLeaveToleranceMin: 0, otThresholdMin: 0, maxHoursPerDay: 8, breakTime: '' },
];

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { symbol: 'X',   name: 'Làm 1 ngày',       description: '', countAsWorkday: true },
  { symbol: 'X/2', name: 'Làm nửa ngày',     description: '', countAsWorkday: '0.5 ngày' },
  { symbol: 'P',   name: 'Nghỉ có phép',     description: '', countAsWorkday: false },
  { symbol: 'PN',  name: 'Phép năm',         description: '', countAsWorkday: false },
  { symbol: 'Ô',   name: 'Nghỉ ốm',          description: '', countAsWorkday: false },
  { symbol: 'TS',  name: 'Nghỉ thai sản',    description: '', countAsWorkday: false },
  { symbol: 'DS',  name: 'Dưỡng sức',        description: '', countAsWorkday: false },
  { symbol: 'O',   name: 'Nghỉ không phép',  description: '', countAsWorkday: false, isViolation: true },
  { symbol: 'NL',  name: 'Nghỉ lễ',          description: '', countAsWorkday: false },
  { symbol: 'LP',  name: 'Nghỉ chủ nhật',    description: '', countAsWorkday: false },
  { symbol: 'LL',  name: 'Đi làm ngày lễ',   description: '', countAsWorkday: true },
  { symbol: 'H',   name: 'Ngày hưởng lương', description: '', countAsWorkday: false },
  { symbol: 'B',   name: 'Không đi làm',     description: '', countAsWorkday: false },
  { symbol: 'OF',  name: 'Thôi việc',        description: '', countAsWorkday: false },
];

export const DEFAULT_SPECIAL_GROUPS: SpecialGroup[] = [
  { code: '18_DUOI_18',      name: 'Nhóm dưới 18 tuổi',  workHours: 7, note: 'Thời gian làm việc 7 giờ/ngày' },
  { code: '19A_CO_THAI',     name: 'Nhóm có thai',       workHours: 7, note: 'Thời gian làm việc 7 giờ/ngày' },
  { code: '19_NUOI_CON_NHO', name: 'Nhóm nuôi con nhỏ',  workHours: 7, note: 'Thời gian làm việc 7 giờ/ngày' },
];

export const DEFAULT_ALLOC_RULES: AllocRule[] = [
  { id: 1, rule: 'Giới hạn ngày làm liên tục',         param: '6 ngày',              description: 'Sau tối đa 6 ngày làm liên tiếp phải có ít nhất 1 ngày nghỉ.' },
  { id: 2, rule: 'Khoảng cách ngày nghỉ liên tháng',   param: '≤ 6 ngày',            description: 'Khoảng cách giữa ngày nghỉ cuối tháng trước và ngày nghỉ đầu tháng hiện tại không vượt quá 6 ngày làm.' },
  { id: 3, rule: 'Phân bổ ngày nghỉ đồng đều',         param: '±1 ngày',             description: 'Số ngày nghỉ của các nhân viên trong cùng phòng ban được phân bổ đều. Chênh lệch tối đa: ±1 ngày.' },
  { id: 4, rule: 'Vị trí phép năm (PN)',                param: 'Từ ngày 15',         description: 'PN được xếp vào ngày CUỐI của chuỗi LP liên tiếp DÀI NHẤT tính từ ngày 15 trở đi.' },
  { id: 5, rule: 'Phân bổ ca cân bằng',                param: 'Chênh lệch ≤ 1 NV',  description: 'Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.' },
  { id: 6, rule: 'Đi trễ tối đa/ngày',                 param: '9 phút/ngày',         description: 'Không có ngày nào có số phút trễ > 9 phút.' },
  { id: 7, rule: 'Tăng ca tối thiểu/ngày',             param: '60 phút/ngày',        description: 'Nếu có tăng ca, số phút OT trong ngày phải ≥ 60 phút.' },
];

export const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: '1', code: 'NV001', name: 'Nguyễn Văn An', department: 'KD',
    workdays: 26, overtimeHours: 12.5, lateMinutes: 25, phepNam: 1.0,
    attendance: { '1': 'X', '2': 'X', '3': 'X', '4': 'X', '5': 'X', '6': 'X', '7': 'LP', '8': 'X' },
  },
  {
    id: '2', code: 'NV002', name: 'Trần Thị Bích', department: 'KD',
    groupCode: '19A_CO_THAI', groupCodeEndDate: '31/05/2026',
    workdays: 24, overtimeHours: 0, lateMinutes: 10, phepNam: 0,
    attendance: { '1': 'X', '2': 'X', '3': 'P', '4': 'X', '5': 'X', '6': 'X', '7': 'LP', '8': 'X' },
  },
  {
    id: '3', code: 'NV003', name: 'Lê Minh Cường', department: 'BB',
    workdays: 25, overtimeHours: 8, lateMinutes: 0, phepNam: 2.0,
    attendance: { '1': 'X', '2': 'LP', '3': 'X', '4': 'X', '5': 'X', '6': 'X', '7': 'LP', '8': 'PN' },
  },
  {
    id: '4', code: 'NV004', name: 'Phạm Hồng Diệu', department: 'KT',
    workdays: 26, overtimeHours: 4, lateMinutes: 45, phepNam: 0,
    attendance: { '1': 'X', '2': 'X', '3': 'X', '4': 'X', '5': 'Ô', '6': 'X', '7': 'LP', '8': 'X' },
  },
  {
    id: '5', code: 'NV005', name: 'Hoàng Văn Em', department: 'NS',
    workdays: 26, overtimeHours: 0, lateMinutes: 0, phepNam: 1.0,
    attendance: { '1': 'X', '2': 'X', '3': 'X', '4': 'X', '5': 'X', '6': 'PN', '7': 'LP', '8': 'X' },
  },
];
