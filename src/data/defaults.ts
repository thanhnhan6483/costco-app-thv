import { Department, Shift, LeaveType, SpecialGroup, Employee, AllocRule } from '@/types';

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: '1', code: 'BGD', name: 'Ban Giám Đốc', active: true },
  { id: '2', code: 'KD', name: 'Kinh Doanh', active: true },
  { id: '3', code: 'SX', name: 'Sản Xuất', active: true },
  { id: '4', code: 'KT', name: 'Kế Toán', active: true },
  { id: '5', code: 'HR', name: 'Nhân Sự', active: true },
];

export const DEFAULT_SHIFTS: Shift[] = [
  {
    id: '1', code: 'CA1', name: 'Ca Sáng',
    departments: ['KD', 'SX', 'KT'],
    startTime: '07:30', endTime: '16:30',
    lateToleranceMin: 9, earlyLeaveToleranceMin: 10,
    otThresholdMin: 60, maxHoursPerDay: 8,
    breakTime: '12:00–13:00',
  },
  {
    id: '2', code: 'CA2', name: 'Ca Chiều',
    departments: ['SX'],
    startTime: '13:00', endTime: '22:00',
    lateToleranceMin: 9, earlyLeaveToleranceMin: 10,
    otThresholdMin: 60, maxHoursPerDay: 8,
    breakTime: '17:00–18:00',
  },
  {
    id: '3', code: 'HC', name: 'Hành Chính',
    departments: ['BGD', 'HR'],
    startTime: '08:00', endTime: '17:00',
    lateToleranceMin: 15, earlyLeaveToleranceMin: 15,
    otThresholdMin: 60, maxHoursPerDay: 8,
    breakTime: '12:00–13:00',
  },
];

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { symbol: 'X', name: 'Làm 1 ngày', description: 'Ngày làm việc đầy đủ.', countAsWorkday: true },
  { symbol: 'X/2', name: 'Làm nửa ngày', description: 'Làm việc nửa ngày (sáng hoặc chiều).', countAsWorkday: '0.5 ngày' },
  { symbol: 'P', name: 'Nghỉ có phép', description: 'Nghỉ được phê duyệt.', countAsWorkday: false },
  { symbol: 'PN', name: 'Phép năm', description: 'Nghỉ phép năm theo chính sách.', countAsWorkday: false },
  { symbol: 'Ô', name: 'Nghỉ ốm', description: 'Nghỉ ốm đau.', countAsWorkday: false },
  { symbol: 'TS', name: 'Nghỉ thai sản', description: 'Nghỉ thai sản theo Luật.', countAsWorkday: false },
  { symbol: 'DS', name: 'Dưỡng sức', description: 'Nghỉ dưỡng sức.', countAsWorkday: false },
  { symbol: 'O', name: 'Nghỉ không phép', description: 'Vắng mặt không lý do.', countAsWorkday: false, isViolation: true },
  { symbol: 'NL', name: 'Nghỉ lễ', description: 'Ngày lễ quốc gia.', countAsWorkday: false },
  { symbol: 'L', name: 'Ngày nghỉ', description: 'Ngày nghỉ thường lệ hàng tuần.', countAsWorkday: false },
  { symbol: 'LP', name: 'Nghỉ chủ nhật', description: 'Ngày Chủ Nhật hoặc nghỉ lịch.', countAsWorkday: false },
  { symbol: 'LL', name: 'Đi làm ngày lễ', description: 'Làm bù ngày lễ/tết.', countAsWorkday: true },
  { symbol: 'LN', name: 'Đi làm ngày nghỉ', description: 'Làm vào ngày nghỉ hàng tuần.', countAsWorkday: true },
  { symbol: 'H', name: 'Ngày hưởng lương', description: 'Ngày không đi làm nhưng hưởng lương.', countAsWorkday: false },
  { symbol: 'B', name: 'Không đi làm', description: 'Ngày không đi làm không lý do rõ.', countAsWorkday: false },
  { symbol: 'OF', name: 'Thôi việc', description: 'Nhân viên đã nghỉ việc.', countAsWorkday: false },
];

export const DEFAULT_SPECIAL_GROUPS: SpecialGroup[] = [
  { code: '18_DUOI_18', name: 'Dưới 18 tuổi', workHours: 7, note: 'Bộ luật Lao động điều 146' },
  { code: '19A_CO_THAI', name: 'Mang thai', workHours: 7, note: 'Bộ luật Lao động điều 137' },
  { code: '19_NUOI_CON_NHO', name: 'Nuôi con nhỏ (< 12 tháng)', workHours: 7, note: 'Bộ luật Lao động điều 137' },
];

export const DEFAULT_ALLOC_RULES: AllocRule[] = [
  { id: 1, rule: 'Giới hạn ngày làm liên tục', param: '6 ngày', description: 'Sau tối đa 6 ngày làm liên tiếp phải có ít nhất 1 ngày nghỉ.' },
  { id: 2, rule: 'Khoảng cách ngày nghỉ liên tháng', param: '≤ 6 ngày', description: 'Khoảng cách giữa ngày nghỉ cuối tháng trước và ngày nghỉ đầu tháng hiện tại không vượt quá 6 ngày làm.' },
  { id: 3, rule: 'Phân bổ ngày nghỉ đồng đều', param: 'Áp dụng cho mọi phòng ban trừ Ban Giám đốc', description: 'Số ngày nghỉ của các nhân viên trong cùng phòng ban được phân bổ đều. Chênh lệch tối đa: ±1 ngày.' },
  { id: 4, rule: 'Vị trí phép năm (PN)', param: 'Cuối kỳ nghỉ', description: 'Ngày PN được ưu tiên xếp vào ngay sau ngày X cuối cùng trong kỳ nghỉ liền kề.' },
  { id: 5, rule: 'Phân bổ ca cân bằng', param: 'Chênh lệch ≤ 1 NV/ca/ngày', description: 'Số lượng nhân viên giữa các ca trong cùng phòng ban phải gần bằng nhau mỗi ngày.' },
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
    id: '3', code: 'NV003', name: 'Lê Minh Cường', department: 'SX',
    workdays: 25, overtimeHours: 8, lateMinutes: 0, phepNam: 2.0,
    attendance: { '1': 'X', '2': 'LP', '3': 'X', '4': 'X', '5': 'X', '6': 'X', '7': 'LP', '8': 'PN' },
  },
  {
    id: '4', code: 'NV004', name: 'Phạm Hồng Diệu', department: 'KT',
    workdays: 26, overtimeHours: 4, lateMinutes: 45, phepNam: 0,
    attendance: { '1': 'X', '2': 'X', '3': 'X', '4': 'X', '5': 'Ô', '6': 'X', '7': 'LP', '8': 'X' },
  },
  {
    id: '5', code: 'NV005', name: 'Hoàng Văn Em', department: 'HR',
    workdays: 26, overtimeHours: 0, lateMinutes: 0, phepNam: 1.0,
    attendance: { '1': 'X', '2': 'X', '3': 'X', '4': 'X', '5': 'X', '6': 'PN', '7': 'LP', '8': 'X' },
  },
];
