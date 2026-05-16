from odoo import models, fields, api, _
import numpy as np
import random
import base64
import xlsxwriter
from io import BytesIO
from datetime import datetime, timedelta, date
import xlrd
import calendar
VIETNAMESE_MONTHS = {
    1: 'Tháng Một', 2: 'Tháng Hai', 3: 'Tháng Ba', 4: 'Tháng Tư',
    5: 'Tháng Năm', 6: 'Tháng Sáu', 7: 'Tháng Bảy', 8: 'Tháng Tám',
    9: 'Tháng Chín', 10: 'Tháng Mười', 11: 'Tháng Mười Một', 12: 'Tháng Mười Hai'
}

DEPARTMENT_TIMES = {
    "BO_PHAN_KE_TOAN": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:30")},
    "BỘ PHẬN BẢO VỆ 1": {"IN": ("05:45", "06:15", "06:00"), "OUT": ("13:55", "14:15", "14:00")},
    "BỘ PHẬN BẢO VỆ 2": {"IN": ("9:45", "10:15", "10:00"), "OUT": ("15:55", "18:10", "18:00")},
    "Cửa Hàng 1": {"IN": ("06:15", "06:45", "06:30"), "OUT": ("14:25", "14:40", "14:30")},
    "Cửa Hàng 2": {"IN": ("11:35", "12:15", "12:00"), "OUT": ("19:55", "20:10", "20:00")},
    "Nhà Hàng 1": {"IN": ("06:15", "06:45", "06:30"), "OUT": ("14:25", "14:45", "14:30")},
    "Nhà Hàng 2": {"IN": ("11:45", "12:15", "12:00"), "OUT": ("19:55", "20:10", "20:00")},
}

class MonthlyAttendanceDistribution(models.Model):
    _name = 'hr.monthly.attendance.distribution'
    _description = 'Monthly Attendance Distribution'

    name = fields.Char(string='Name', compute='_compute_name', store=True)
    month = fields.Date(string='Month', required=True)
    distribution_line_ids = fields.One2many('hr.monthly.attendance.distribution.line', 'distribution_id', string='DistributionLines')
    days_in_month = fields.Integer(string='Days in Month', compute='_compute_days_in_month', store=True)
    total_employees = fields.Integer(string='Total Employees', compute='_compute_statistics')
    attendance_file = fields.Binary(string='Attendance Excel File')
    attendance_filename = fields.Char(string='Attendance Filename')
    excel_file = fields.Binary(string='Download Excel', readonly=True)
    file_name = fields.Char(string='Excel File Name', readonly=True)

    @api.depends('distribution_line_ids')
    def _compute_statistics(self):
        for record in self:
            record.total_employees = len(record.distribution_line_ids)

    @api.depends('month')
    def _compute_name(self):
        for record in self:
            if record.month:
                record.name = f"{VIETNAMESE_MONTHS[record.month.month]} {record.month.year}"
            else:
                record.name = 'New distribution'

    @api.depends('month')
    def _compute_days_in_month(self):
        for record in self:
            if record.month:
                next_month = record.month + timedelta(days=32)
                last_day = next_month.replace(day=1) - timedelta(days=1)
                record.days_in_month = last_day.day
            else:
                record.days_in_month = 31

    def process_attendance_distribution(self):
        def random_time(start_time, end_time):
            start_time = datetime.strptime(start_time, "%H:%M")
            end_time = datetime.strptime(end_time, "%H:%M")
            time_delta = (end_time - start_time).total_seconds()
            random_seconds = random.randint(0, int(time_delta))
            random_time = start_time + timedelta(seconds=random_seconds)
            return random_time.strftime("%H:%M")

        def get_department_schedule(department):
            if department:
                schedule = DEPARTMENT_TIMES.get(department)
                if schedule:
                    return schedule["IN"], schedule["OUT"]
            return None

        def distribute_overtime_hours(array, number_to_distribute):
            """
            Hàm phân bổ giờ tăng ca
            - Chỉ phân bổ giờ tăng ca từ vị trí thứ 15 trở đi
            - Tối đa mỗi ngày chỉ được làm thêm 4 tiếng
            """
            result_array = array.copy()

            # Đặt các phần tử khác 0 thành None
            for i in range(len(result_array)):
                if result_array[i] != 0:
                    result_array[i] = -1

            # Bắt đầu từ vị trí thứ 15 (index 14)
            start_index = 14

            while number_to_distribute > 0 and start_index < len(result_array):
                if result_array[start_index] == 0:
                    # Chọn một số ngẫu nhiên từ 1 đến 4, nhưng không vượt quá số cần phân bổ
                    amount = min(random.randint(1, 4), number_to_distribute)

                    # Gán số ngẫu nhiên vào phần tử hiện tại của mảng
                    result_array[start_index] = amount

                    # Giảm số cần phân bổ
                    number_to_distribute -= amount

                # Di chuyển đến phần tử tiếp theo
                start_index += 1

            return result_array, number_to_distribute

        def distribute_late_minutes(array, number_to_distribute):
            """
            Hàm phân bổ số phút trễ
            - Tối đa mỗi ngày chỉ được trễ 14 phút
            """
            result_array = array.copy()

            # Đặt các phần tử khác 0 thành None
            for i in range(len(result_array)):
                if result_array[i] != 0:
                    result_array[i] = -1

            # Bắt đầu từ vị trí thứ 15 (index 14)
            start_index = 14

            while number_to_distribute > 0 and start_index < len(result_array):
                if result_array[start_index] == 0:
                    # Chọn một số ngẫu nhiên từ 1 đến 14, nhưng không vượt quá số cần phân bổ
                    amount = min(random.randint(1, 14), number_to_distribute)

                    # Gán số ngẫu nhiên vào phần tử hiện tại của mảng
                    result_array[start_index] = amount

                    # Giảm số cần phân bổ
                    number_to_distribute -= amount

                # Di chuyển đến phần tử tiếp theo
                start_index += 1

            return result_array, number_to_distribute

        for record in self:
            distribution = record
            output = BytesIO()
            workbook = xlsxwriter.Workbook(output, {'in_memory': True})
            worksheet = workbook.add_worksheet('Attendance')

            # Styles
            header_style = workbook.add_format(
                {'bold': True, 'align': 'center', 'valign': 'vcenter', 'bg_color': '#D3D3D3'})
            time_style = workbook.add_format({'num_format': 'hh:mm', 'align': 'center'})
            rest_day_style = workbook.add_format({'align': 'center', 'bg_color': '#FFD700'})
            day_special_style = workbook.add_format({'align': 'center', 'bg_color': '#008000'})
            day_special_1_style = workbook.add_format({'align': 'center', 'bg_color': '#fd7e14'})
            sub_total_style = workbook.add_format({'bold': True, 'align': 'center', 'valign': 'vcenter', 'bg_color': '#96c5df'})
            total_style = workbook.add_format({'bold': True, 'align': 'center', 'valign': 'vcenter', 'bg_color': '#A9D08E'})
            warning_style = workbook.add_format({'bold': True, 'align': 'center', 'valign': 'vcenter', 'bg_color': '#ee5363'})

            # Write headers
            headers = ['Mã nhân viên', 'Họ và Tên', 'Chức vụ', 'Tổ/nhóm']
            for col, header in enumerate(headers):
                worksheet.write(0, col, header, header_style)

            col = len(headers)
            current_date = distribution.month
            while current_date.month == distribution.month.month:
                worksheet.write(0, col, current_date.strftime('%d/%m'), header_style)
                worksheet.write(1, col, 'In', header_style)
                worksheet.write(1, col + 1, 'Out', header_style)
                col += 2
                current_date += timedelta(days=1)

            worksheet.write(0, col, 'Giờ trễ/ phút', header_style)
            worksheet.write(0, col + 1, 'Giờ tăng ca/giờ', header_style)
            worksheet.write(0, col + 2, 'Ngày công', header_style)
            worksheet.write(0, col + 3, '', header_style)

            arrangements = self.process_data()
            arrangements_array = np.array(arrangements, dtype=int)

            # Write data
            row = 2
            for line in record.distribution_line_ids:
                employee = line.employee_id
                worksheet.write(row, 0, employee.employee_code or '')
                worksheet.write(row, 1, employee.name)
                worksheet.write(row, 2, employee.job_id.name if employee.job_id else '')
                worksheet.write(row, 3, employee.department_id.name if employee.department_id else '')

                input_str = ''
                for day in range(31):
                    value = getattr(line, f'day_{day + 1}', '')
                    value = ("0" if not value or value == 'X' else
                             "3" if value == 'Ô' else
                             "4" if value == 'TS' else
                             "5" if value == 'DS' else
                             "6" if value == 'O' else
                             "7" if value == 'NL' else
                             "8" if value == 'OF' else
                             "9" if value == 'P' else
                             value)
                    input_str += value + " "
                # Mảng giá trị ban đầu với các tham số giữ nguyên
                input_array = list(map(int, input_str.split()))

                if line.actual_workdays < 27:
                    # num_zeros = input_array.count(0) - 4 - 1
                    num_zeros = 26
                    random_arrangement = self.generate_random_arrangement(0, 4, num_zeros, False, 0, input_array, [])
                else:
                    # Chọn ngẫu nhiên một cách sắp xếp
                    random_index = np.random.randint(0, len(arrangements))
                    random_arrangement = arrangements_array[random_index]

                if employee.department_id and employee.department_id.name == "BỘ PHẬN KẾ TOÁN":
                    random_arrangement, is_saturday = self.generate_calendar_array(7, 2024, input_array)

                # Phân bổ giờ tăng ca và số phút đi trễ vào mảng
                overtime_hours = line.overtime_hours
                overtime_hours_array, remaining = distribute_overtime_hours(random_arrangement, overtime_hours)
                late_minutes = line.late_minutes
                late_minutes_array, remaining = distribute_late_minutes(random_arrangement, late_minutes)

                col = 4
                workdays = 0
                for day in range(record.days_in_month):
                    # Ngày làm việc
                    if random_arrangement[day] == 0:
                        random_one_or_two = random.randint(1, 2)
                        if employee.department_id.name == "Cửa Hàng":
                            time_schedule = get_department_schedule("Cửa Hàng " + str(random_one_or_two))
                        elif  employee.department_id.name == "Nhà Hàng":
                            time_schedule = get_department_schedule("Nhà Hàng " + str(random_one_or_two))
                        elif employee.department_id.name == "BỘ PHẬN BẢO VỆ":
                            time_schedule = get_department_schedule("BỘ PHẬN BẢO VỆ " + str(random_one_or_two))
                        else:
                            time_schedule = None

                        if time_schedule:
                            time_in_range, time_out_range = time_schedule
                            checkin_time = random_time(time_in_range[0], time_in_range[1])
                            checkin_time_default = time_in_range[2]
                            checkout_time = random_time(time_out_range[0], time_out_range[1])
                            checkout_time_default = time_out_range[2]
                        else:
                            checkin_time = random_time("07:05", "07:45")
                            checkin_time_default = "07:30"
                            checkout_time = random_time("16:25", "16:40")
                            checkout_time_default = "16:30"

                        # Phân bổ giờ tăng ca
                        if overtime_hours_array[day] not in {0, -1}:
                            random_minutes = random.randint(0, 10)
                            checkout_time = datetime.strptime(checkout_time_default, "%H:%M") + timedelta(hours=int(overtime_hours_array[day])) + timedelta(minutes=random_minutes)

                        # Phân bổ số phút đi trễ
                        if late_minutes_array[day] not in {0, -1}:
                            checkin_time = datetime.strptime(checkin_time_default, "%H:%M") + timedelta(
                                minutes=int(late_minutes_array[day]) + 15)

                        # Những nhân viên dưới 18, có thai, nuôi con nhỏ thời gian làm việc ít hơn 1 tiếng (7 tiếng)
                        if employee.employee_group_ids and (employee.employee_group_ids.code == "18_DUOI_18" or employee.employee_group_ids.code == "19A_CO_THAI"  or employee.employee_group_ids.code == "19_NUOI_CON_NHO"):
                            if isinstance(checkout_time, datetime):
                                checkout_time = checkout_time - timedelta(hours=1)
                            else:
                                checkout_time = datetime.strptime(checkout_time, "%H:%M") - timedelta(hours=1)

                        worksheet.write(row, col, checkin_time, time_style)
                        worksheet.write(row, col+1, checkout_time, time_style)
                        workdays += 1
                    # Ngày nghỉ
                    elif random_arrangement[day] == 1:
                        worksheet.write(row, col, "00:00", rest_day_style)
                        worksheet.write(row, col+1, "00:00", rest_day_style)
                    # Phép năm
                    elif random_arrangement[day] == 2:
                        worksheet.write(row, col, "PN", day_special_style)
                        worksheet.write(row, col+1, "PN", day_special_style)
                        # Là phép năm nên vẫn tính là ngày công
                        workdays += 1
                    # Những loại nghỉ còn lại
                    else:
                        value = random_arrangement[day]
                        value = ("Ô" if value == 3 else
                                 "TS" if value == 4 else
                                 "DS" if value == 5 else
                                 "O" if value == 6 else
                                 "NL" if value == 7 else
                                 "OF" if value == 8 else
                                 "P" if value == 9 else
                                 value)
                        worksheet.write(row, col, value, day_special_1_style)
                        worksheet.write(row, col+1, value, day_special_1_style)
                    col += 2

                    #Total
                    worksheet.write(row, col, late_minutes, sub_total_style)
                    worksheet.write(row, col + 1, overtime_hours, sub_total_style)
                    worksheet.write(row, col + 2, line.actual_workdays, total_style)
                    if workdays != line.actual_workdays:
                        worksheet.write(row, col + 3, workdays, warning_style)
                    else:
                        worksheet.write(row, col + 3, workdays, total_style)
                row += 1

            # Adjust column widths
            worksheet.set_column(0, 4, 20)  # Employee Code, Name, Job Position, Department, Shifts
            worksheet.set_column(4, col, 5)
            worksheet.set_column(col, col + 1, 8)

            workbook.close()
            excel_data = output.getvalue()
            record.excel_file = base64.b64encode(excel_data)
            now = datetime.now()
            record.file_name = f'phan_bo_ngay_cong_{now.strftime("%Y_%m_%H_%M_%S")}.xlsx'
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'message': "Đã tạo xong file, vui lòng download về.",
                    'type': 'success',
                    'sticky': False,
                }
            }

    def process_import_attendance_data(self):
        if not self.attendance_file:
            return

        workbook = xlrd.open_workbook(file_contents=base64.b64decode(self.attendance_file))
        sheet = workbook.sheet_by_index(0)

        headers = [sheet.cell_value(0, col).lower() for col in range(sheet.ncols)]
        workdays_col = headers.index('workdays') if 'workdays' in headers else None

        day_columns = {}
        for col, header in enumerate(headers):
            if 'day ' in header:
                day = int(header.split()[1])
                day_columns[day] = col

        for row in range(1, sheet.nrows):
            employee_code = sheet.cell_value(row, 0)
            if isinstance(employee_code, float):
                employee_code = str(int(employee_code))
            elif isinstance(employee_code, str):
                employee_code = employee_code.replace('.0', '').replace('-', '')
            else:
                employee_code = 'NULL'
            employee = self.env['hr.employee'].search([('employee_code', '=', employee_code)], limit=1)
            if employee:
                distribution_line = self.distribution_line_ids.filtered(lambda l: l.employee_id == employee)
                if not distribution_line:
                    distribution_line = self.env['hr.monthly.attendance.distribution.line'].create({
                        'distribution_id': self.id,
                        'employee_id': employee.id,
                    })

                for day, columns in day_columns.items():
                    value = str(sheet.cell_value(row, columns))
                    if value.upper() != 'X':
                        setattr(distribution_line, f'day_{day}', value)
                    elif value.upper() == 'X':
                        setattr(distribution_line, f'day_{day}', "X")

                if workdays_col is not None:
                    workdays = sheet.cell_value(row, workdays_col)
                    distribution_line.actual_workdays = workdays

        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def generate_calendar_array(self, month, year, input_array):
        # Tạo đối tượng calendar
        cal = calendar.Calendar()

        # Lấy tất cả các ngày trong tháng
        month_days = list(cal.itermonthdates(year, month))

        # Sử dụng mảng đầu vào, nếu độ dài không đủ 31, thêm 0 vào cuối
        array = input_array + [0] * (31 - len(input_array))

        # Ngẫu nhiên chọn đánh dấu thứ 7 hoặc chủ nhật
        is_saturday = random.choice([True, False])

        # Tìm hai tuần cuối cùng của tháng
        last_two_weeks = [day for day in month_days if day.month == month][-14:]

        for day in month_days:
            # Chỉ xét các ngày trong tháng được chọn
            if day.month == month:
                # Đánh dấu 1 cho tất cả các ngày thứ 7 hoặc chủ nhật, tùy theo lựa chọn ngẫu nhiên
                # Chỉ đánh dấu nếu giá trị hiện tại là 0
                if array[day.day - 1] == 0:
                    if (is_saturday and day.weekday() == 5) or (not is_saturday and day.weekday() == 6):
                        array[day.day - 1] = 1

        # Ngẫu nhiên chọn tuần kế cuối hoặc tuần cuối để đặt số 2
        chosen_week = random.choice([last_two_weeks[:7], last_two_weeks[7:]])

        # Tìm ngày cuối tuần đối diện trong tuần đã chọn để đặt số 2
        opposite_day = 6 if is_saturday else 5  # Chủ nhật nếu chọn thứ 7, và ngược lại
        opposite_weekend_days = [day for day in chosen_week if day.weekday() == opposite_day and day.month == month]

        if opposite_weekend_days:
            chosen_day = random.choice(opposite_weekend_days)
            # Chỉ đánh dấu 2 nếu giá trị hiện tại là 0
            if array[chosen_day.day - 1] == 0:
                array[chosen_day.day - 1] = 2

        return array, is_saturday

    def generate_random_arrangement(self, pos, ones, zeros, two_placed, last_zeros, fixed_array, current_arrangement):
        if pos == 31:
            return current_arrangement if two_placed else None

        if fixed_array[pos] not in {0, 1, 2}:
            return self.generate_random_arrangement(pos + 1, ones, zeros, two_placed, 0, fixed_array,
                                               current_arrangement + [fixed_array[pos]])

        options = []
        if ones > 0 and fixed_array[pos] == 0:
            options.append((pos + 1, ones - 1, zeros, two_placed, 0, 1))
        if zeros > 0 and last_zeros < 6 and fixed_array[pos] == 0:
            options.append((pos + 1, ones, zeros - 1, two_placed, last_zeros + 1, 0))
        if not two_placed and pos >= 14 and fixed_array[pos] == 0:
            options.append((pos + 1, ones, zeros, True, 0, 2))

        random.shuffle(options)

        for next_pos, next_ones, next_zeros, next_two_placed, next_last_zeros, value in options:
            result = self.generate_random_arrangement(next_pos, next_ones, next_zeros, next_two_placed, next_last_zeros,
                                                 fixed_array, current_arrangement + [value])
            if result:
                return result

        return None

    def process_data(self):
        def generate_arrangements(pos, ones, zeros, pn_placed, last_zeros, current_arrangement):
            """
            Hàm đệ quy trả về 1 mảng các cách sắp xếp thoả điều kiện
            - Không bao giờ có 6 phần tử có giá trị 0 liên tục
            - Giá trị 2 (dại diện phép năm) phải nằm ở vị trí 15 trở về sau
            """
            if pos == 31:
                if pn_placed:
                    yield current_arrangement
                return

            if ones > 0:
                yield from generate_arrangements(pos + 1, ones - 1, zeros, pn_placed, 0, current_arrangement + [1])

            if zeros > 0 and last_zeros < 6:
                yield from generate_arrangements(pos + 1, ones, zeros - 1, pn_placed, last_zeros + 1,
                                                 current_arrangement + [0])

            if not pn_placed and pos >= 14:
                yield from generate_arrangements(pos + 1, ones, zeros, True, 0,
                                                 current_arrangement + [2])  # 2 đại diện cho 'PN'

        arrangements = []

        for i, arrangement in enumerate(generate_arrangements(0, 4, 26, False, 0, []), 1):
            arrangements.append(arrangement)

        return arrangements



class MonthlyAttendanceDistributionLine(models.Model):
    _name = 'hr.monthly.attendance.distribution.line'
    _description = 'Monthly Attendance Distribution Line'

    distribution_id = fields.Many2one('hr.monthly.attendance.distribution', string='Attendance Distribution', required=True,
                                ondelete='cascade')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True)
    employee_name = fields.Char(related='employee_id.name', string='Employee Name', store=True)
    employee_code = fields.Char(related='employee_id.employee_code', string='Employee Code', store=True)
    workdays = fields.Float(string='Workdays', digits=(5, 2), default=27)
    actual_workdays = fields.Float(string='Actual workdays', digits=(5, 2))
    late_minutes = fields.Float(string='Late minutes', digits=(5, 2))
    overtime_hours = fields.Float(string='Overtime hours', digits=(5, 2))

    # Generate fields for each day dynamically
    for day in range(1, 32):
        locals()[f'day_{day}'] = fields.Char(string=f'Day {day}')
        locals()[f'day_{day}_time'] = fields.Char(string=f'Day {day}')