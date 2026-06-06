from odoo import models, fields, api, _
import numpy as np
import random
import base64
import xlsxwriter
from io import BytesIO
from datetime import datetime, timedelta, date
import xlrd
import calendar
from dateutil.relativedelta import relativedelta
import json
from odoo.exceptions import UserError

VIETNAMESE_MONTHS = {
    1: 'Tháng Một', 2: 'Tháng Hai', 3: 'Tháng Ba', 4: 'Tháng Tư',
    5: 'Tháng Năm', 6: 'Tháng Sáu', 7: 'Tháng Bảy', 8: 'Tháng Tám',
    9: 'Tháng Chín', 10: 'Tháng Mười', 11: 'Tháng Mười Một', 12: 'Tháng Mười Hai'
}

DEPARTMENT_TIMES = {
    "BỘ PHẬN KẾ TOÁN": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:00")},
    "KHO THÀNH PHẨM": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:00")},
    "CHI NHÁNH ST": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:00")},
    "CƠ ĐIỆN": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:00")},
    "CƠ KHÍ": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:00")},
    "VỆ SINH": {"IN": ("07:05", "07:30", "07:30"), "OUT": ("17:25", "17:40", "17:00")},
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
    _order = 'create_date desc'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Name', compute='_compute_name', store=True)
    month = fields.Date(string='Month', required=True)
    distribution_line_ids = fields.One2many('hr.monthly.attendance.distribution.line', 'distribution_id', string='DistributionLines')
    days_in_month = fields.Integer(string='Days in Month', compute='_compute_days_in_month', store=True)
    monthly_leave_days = fields.Integer(string='Monthly leave days', default=5, tracking=True)
    number_col_gen_in_array = fields.Integer(string='Số cột phân phối', tracking=True)
    total_employees = fields.Integer(string='Total Employees', compute='_compute_statistics')
    attendance_file = fields.Binary(string='Attendance Excel File')
    attendance_filename = fields.Char(string='Attendance Filename')
    excel_file = fields.Binary(string='Download Excel', readonly=True)
    file_name = fields.Char(string='Excel File Name', readonly=True)

    # New field to store working hours configuration as JSON
    working_hours_config = fields.Json(
        string='Working Hours Configuration',
        help='Stored configuration of working hours at the time of distribution creation'
    )
    config_created_date = fields.Datetime(
        string='Configuration Created Date',
        help='Date when the working hours configuration was captured'
    )

    working_hours_config_summary = fields.Html(
        string='Configuration Summary',
        compute='_compute_working_hours_config_summary',
        help='HTML summary of working hours configuration'
    )

    @api.model_create_multi
    def create(self, vals_list):
        """Override create to capture working hours configuration"""
        records = super(MonthlyAttendanceDistribution, self).create(vals_list)

        for record in records:
            # Capture working hours configuration when creating new distribution
            record._capture_working_hours_config()

        return records

    def _capture_working_hours_config(self):
        """Capture current working hours configuration and store as JSON"""
        try:
            working_hours_data = self._get_all_working_hours_config()
            self.working_hours_config = working_hours_data
            self.config_created_date = fields.Datetime.now()

            # Log the configuration capture
            self.message_post(
                body=_("Working hours configuration captured with %d departments and %d total settings.") % (
                    len(working_hours_data.get('departments', {})),
                    len(working_hours_data.get('all_settings', []))
                )
            )

        except Exception as e:
            # Don't fail the creation process, just log the error
            self.message_post(
                body=_("Warning: Could not capture working hours configuration: %s") % str(e)
            )

    def _get_all_working_hours_config(self):
        """Get all working hours configuration and return as dictionary"""
        working_hours_records = self.env['hr.working.hours'].search([])

        config_data = {
            'capture_date': fields.Datetime.now().isoformat(),
            'month': self.month.isoformat() if self.month else None,
            'departments': {},
            'default_settings': {},
            'all_settings': [],
            'employee_assignments': {}
        }

        # Group by department and shift type
        for working_hour in working_hours_records:
            # Store all settings
            setting_data = {
                'id': working_hour.id,
                'name': working_hour.name,
                'department_id': working_hour.department_id.id if working_hour.department_id else None,
                'department_name': working_hour.department_id.name if working_hour.department_id else None,
                'is_default': working_hour.is_default,
                'shift_type': working_hour.shift_type,
                'department_shift_count': working_hour.department_shift_count,
                'check_in_time_from': working_hour.check_in_time_from,
                'check_in_time': working_hour.check_in_time,
                'check_out_time': working_hour.check_out_time,
                'check_out_time_to': working_hour.check_out_time_to,
                'late_threshold': working_hour.late_threshold,
                'overtime_threshold': working_hour.overtime_threshold,
                'overtime_calculation_method': working_hour.overtime_calculation_method,
                'employee_count': working_hour.employee_count,
                'employee_ids': working_hour.employee_ids.ids
            }

            config_data['all_settings'].append(setting_data)

            # Store default settings
            if working_hour.is_default:
                config_data['default_settings'][working_hour.shift_type] = setting_data

            # Store department settings
            if working_hour.department_id:
                dept_key = f"dept_{working_hour.department_id.id}"
                if dept_key not in config_data['departments']:
                    config_data['departments'][dept_key] = {
                        'department_id': working_hour.department_id.id,
                        'department_name': working_hour.department_id.name,
                        'shifts': {}
                    }

                config_data['departments'][dept_key]['shifts'][working_hour.shift_type] = setting_data

            # Store employee assignments
            for employee in working_hour.employee_ids:
                if employee.id not in config_data['employee_assignments']:
                    config_data['employee_assignments'][employee.id] = []
                config_data['employee_assignments'][employee.id].append({
                    'working_hours_id': working_hour.id,
                    'working_hours_name': working_hour.name,
                    'shift_type': working_hour.shift_type,
                    'employee_id': employee.id,
                    'employee_name': employee.name,
                    'employee_code': getattr(employee, 'employee_code', ''),
                    'department_id': employee.department_id.id if employee.department_id else None,
                    'department_name': employee.department_id.name if employee.department_id else ''
                })

        return config_data

    @api.depends('working_hours_config')
    def _compute_working_hours_config_summary(self):
        """Compute formatted JSON display"""
        for record in self:
            if record.working_hours_config:
                try:
                    # Pretty print JSON with proper indentation
                    formatted_json = json.dumps(record.working_hours_config, indent=4, ensure_ascii=False,
                                                sort_keys=True)
                    record.working_hours_config_summary = formatted_json
                except Exception as e:
                    record.working_hours_config_summary = f"Error formatting JSON: {str(e)}"
            else:
                record.working_hours_config_summary = "No configuration data available"

    def write(self, vals):
        """Override write to handle attendance file logging with downloadable link"""
        # Track file changes with more detailed information
        _track_file_info = {}
        if 'attendance_file' in vals and vals['attendance_file']:
            filename = vals.get('attendance_filename', self.attendance_filename)
            # Store info to post message after write is completed
            _track_file_info = {
                'filename': filename,
                'content': vals['attendance_file']
            }

        result = super(MonthlyAttendanceDistribution, self).write(vals)

        # Post message after write if we have file info
        try:
            if _track_file_info:
                filename = _track_file_info.get('filename')
                # Create an attachment for the file
                attachment_id = self.env['ir.attachment'].create({
                    'name': filename,
                    'datas': vals['attendance_file'],  # Binary content
                    'res_model': self._name,
                    'res_id': self.id,
                    'type': 'binary',
                })

                # Create a message with the attachment linked
                self.message_post(
                    body=_("Attendance file updated: %s-%s") %
                         (attachment_id.id, filename),
                    attachment_ids=[attachment_id.id]
                )
        except Exception as e:
            # Log error but don't stop process
            _logger.error("Error creating attachment for file: %s", e)

        return result

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

    def process_import_attendance_data(self):
        def convert_date_format(value):
            """
            Chuyển đổi giá trị Excel serial number thành ngày tháng

            :param value: Giá trị ngày tháng từ Excel (có thể là serial number hoặc chuỗi)
            :return: Đối tượng datetime hoặc False nếu không chuyển đổi được
            """
            if not value:
                return False

            # Xử lý giá trị số (serial number của Excel)
            if isinstance(value, (int, float)):
                try:
                    # Excel bắt đầu từ ngày 1/1/1900
                    # Điều chỉnh đối với lỗi năm nhuận 1900 của Excel
                    if value > 60:
                        value -= 1

                    # Chuyển đổi số ngày thành datetime
                    base_date = datetime(1900, 1, 1)
                    date_value = base_date + timedelta(days=int(value) - 1)
                    return date_value
                except Exception as e:
                    self.env.user.notify_warning(message=f"Lỗi chuyển đổi ngày tháng: {e}")
                    return False

            # Xử lý giá trị chuỗi
            if isinstance(value, str):
                try:
                    # Thử chuyển đổi chuỗi thành datetime bằng các định dạng phổ biến
                    formats = ['%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m-%d-%Y']

                    for fmt in formats:
                        try:
                            return datetime.strptime(value, fmt)
                        except ValueError:
                            continue

                    # Nếu không có định dạng nào khớp
                    return False

                except Exception as e:
                    self.env.user.notify_warning(message=f"Lỗi chuyển đổi chuỗi ngày tháng: {e}")
                    return False

            return False

        if not self.attendance_file:
            return

        workbook = xlrd.open_workbook(file_contents=base64.b64decode(self.attendance_file))
        sheet = workbook.sheet_by_index(0)

        # Get employee codes from excel file
        employee_codes_in_file = set()
        data_start_row = 1  # First row of actual data

        for row_idx in range(data_start_row, sheet.nrows):
            employee_code = str(sheet.cell_value(row_idx, 0)).strip()
            if employee_code:
                employee_codes_in_file.add(employee_code)

        # Update inactive status for employees not in file
        missing_employees = self.env['hr.employee'].search([
            ('employee_code', 'not in', list(employee_codes_in_file))
        ])
        if missing_employees:
            missing_employees.write({
                'is_active': False,
                'active': False
            })

        # Process column headers
        headers = [sheet.cell_value(0, col).lower() for col in range(sheet.ncols)]
        department_col = headers.index('department') if 'department' in headers else None
        group_code_col = headers.index('group_code') if 'group_code' in headers else None
        group_code_end_date_col = headers.index('group_code_end_date') if 'group_code_end_date' in headers else None
        workdays_col = headers.index('workdays') if 'workdays' in headers else None
        overtime_hours_col = headers.index('overtime_hours') if 'overtime_hours' in headers else None
        late_minutes_col = headers.index('late_minutes') if 'late_minutes' in headers else None
        attendance_type_pn_col = headers.index('phep_nam') if 'phep_nam' in headers else None

        # Map day columns
        day_columns = {}
        for col, header in enumerate(headers):
            if 'day ' in header:
                day = int(header.split()[1])
                day_columns[day] = col

        # Process each row
        order_number = 0
        for row in range(1, sheet.nrows):
            order_number += 1
            # Get employee code
            employee_code = sheet.cell_value(row, 0)
            if isinstance(employee_code, float):
                employee_code = str(int(employee_code))
            elif isinstance(employee_code, str):
                employee_code = employee_code.replace('.0', '').replace('-', '')
            else:
                employee_code = 'NULL'

            # Find employee and distribution line
            employee = self.env['hr.employee'].search([('employee_code', '=', employee_code)], limit=1)
            if not employee:
                continue

            distribution_line = self.distribution_line_ids.filtered(lambda l: l.employee_id == employee)

            # Handle employee not in file
            if employee.employee_code not in employee_codes_in_file and distribution_line:
                distribution_line.unlink()
                continue

            # Create new distribution line if needed
            if not distribution_line:
                distribution_line = self.env['hr.monthly.attendance.distribution.line'].create({
                    'distribution_id': self.id,
                    'employee_id': employee.id,
                    'order_number': order_number,
                })

            excel_values = {}
            # Import tất cả giá trị từ excel
            for day, col in day_columns.items():
                excel_value = str(sheet.cell_value(row, col)).strip()
                # excel_values[day] = excel_value

                # if not excel_value:
                #     excel_value = "X"
                #
                # values = {f'day_{day}': excel_value}
                # distribution_line.write(values)

                if excel_value:
                    #Lưu trữ vị trí LP và giá trị hiện tại trong database
                    lp_positions = []
                    x_positions = []
                    for day_pos in range(1, 32):
                        current_value = getattr(distribution_line, f'day_{day_pos}', '')
                        if current_value == 'LP':
                            lp_positions.append(day_pos)
                        elif current_value == 'X':
                            x_positions.append(day_pos)

                    if excel_value.upper() != 'X' and excel_value.upper() != 'NL':
                        values = {}
                        if day in lp_positions and x_positions:
                            random_x = random.choice(x_positions)
                            # Xóa vị trí đã sử dụng khỏi danh sách x_positions
                            x_positions.remove(random_x)
                            values[f'day_{random_x}'] = 'LP'
                        values[f'day_{day}'] = excel_value
                        distribution_line.write(values)
                    elif excel_value.upper() == 'NL':
                        values = {f'day_{day}': excel_value}
                        distribution_line.write(values)

            # Update statistics fields
            distribution_line.order_number = order_number
            if department_col is not None:
                department_name = str(sheet.cell_value(row, department_col)).strip()
                department = self.search_department(department_name)
                if not department:
                    department = self.env['hr.department'].create({
                        'name': department_name
                    })
                distribution_line.department_id = department.id
                distribution_line.department_name = department.name
            if group_code_col is not None:
                distribution_line.group_code = str(sheet.cell_value(row, group_code_col)).strip()
                if group_code_end_date_col is not None and str(sheet.cell_value(row, group_code_end_date_col)).strip():
                    distribution_line.group_code_end_date = convert_date_format(sheet.cell_value(row, group_code_end_date_col))
            if workdays_col is not None:
                distribution_line.workdays_compare = sheet.cell_value(row, workdays_col)
            if late_minutes_col is not None:
                late_minutes = sheet.cell_value(row, late_minutes_col)
                distribution_line.late_minutes = late_minutes
            if overtime_hours_col is not None:
                overtime_hours = sheet.cell_value(row, overtime_hours_col)
                distribution_line.overtime_hours = overtime_hours
            if attendance_type_pn_col is not None:
                number_attendance_type_pn = sheet.cell_value(row, attendance_type_pn_col)
                if number_attendance_type_pn:
                    distribution_line.number_attendance_type_pn = int(number_attendance_type_pn)
                else:
                    distribution_line.number_attendance_type_pn = 0


        # self.process_attendance_data()
        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def process_attendance_data(self):
        for distribution_line in self.distribution_line_ids:
            # Xử lý phép năm
            # if distribution_line.number_attendance_type_pn:
            distribution_line._onchange_number_attendance_type_pn()

            # Phân phối lại các phút đến trễ
            if distribution_line.late_minutes:
                for day in range(1, 32):
                    setattr(distribution_line, f'day_{day}_late', '')
                distribution_line.distribute_late_minutes(distribution_line.late_minutes)

            #     # Phân phối lại các giờ tăng ca thành phút
            # if distribution_line.overtime_hours:
            #     for day in range(1, 32):
            #         setattr(distribution_line, f'day_{day}_overtime', '')
            #     distribution_line.distribute_overtime_minutes(distribution_line.overtime_hours * 60)
            #
            # # Sinh lại giờ vào/ra
            # distribution_line.gen_checkin_check_out(distribution_line.employee_id)
            # Tính lại ngày công thực tế
            distribution_line._compute_actual_workdays()
        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def check_lp_pn_attendance_data(self):
        for distribution_line in self.distribution_line_ids:
            if distribution_line.number_attendance_type_pn:
                current_pn = sum(1 for day in range(1, 32) if getattr(distribution_line, f'day_{day}', '') == 'PN')
                current_lp = sum(1 for day in range(1, 32) if getattr(distribution_line, f'day_{day}', '') == 'LP')
            # Tính lại ngày công thực tế
            distribution_line._compute_actual_workdays()
            distribution_line._compute_number_attendance_type()
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

    def generate_random_arrangement(self, pos, ones, zeros, two_placed, last_zeros, fixed_array, current_arrangement,
                                    first_one_pos):
        if pos == 31:
            return current_arrangement if two_placed else None

        if fixed_array[pos] not in {0, 1, 2}:
            return self.generate_random_arrangement(pos + 1, ones, zeros, two_placed, 0, fixed_array,
                                                    current_arrangement + [fixed_array[pos]], first_one_pos)

        options = []
        if ones > 0 and fixed_array[pos] == 0 and pos >= first_one_pos:
            options.append((pos + 1, ones - 1, zeros, two_placed, 0, 1))
        if zeros > 0 and last_zeros < 6 and fixed_array[pos] == 0:
            options.append((pos + 1, ones, zeros - 1, two_placed, last_zeros + 1, 0))
        if not two_placed and pos >= 14 and fixed_array[pos] == 0:
            options.append((pos + 1, ones, zeros, True, 0, 2))

        random.shuffle(options)

        for next_pos, next_ones, next_zeros, next_two_placed, next_last_zeros, value in options:
            result = self.generate_random_arrangement(next_pos, next_ones, next_zeros, next_two_placed, next_last_zeros,
                                                      fixed_array, current_arrangement + [value], first_one_pos)
            if result:
                return result

        return None

    def import_data(self):
        existing_wizard = self.env['hr.monthly.attendance.distribution.line.import.wizard'].search([
            ('distribution_id', '=', self.id)
        ], limit=1, order='create_date desc')

        if existing_wizard:
            return {
                'name': 'Import Data',
                'type': 'ir.actions.act_window',
                'res_model': 'hr.monthly.attendance.distribution.line.import.wizard',
                'res_id': existing_wizard.id,
                'view_mode': 'form',
                'target': 'new',
            }
        else:
            return {
                'name': 'Import Data',
                'type': 'ir.actions.act_window',
                'res_model': 'hr.monthly.attendance.distribution.line.import.wizard',
                'view_mode': 'form',
                'target': 'new',
                'context': {'default_distribution_id': self.id},
            }

    def import_overtime_data(self):
        return {
            'name': 'Import Data',
            'type': 'ir.actions.act_window',
            'res_model': 'hr.monthly.attendance.distribution.line.import.overtime.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_distribution_id': self.id},
        }

    def normalize_department_name(self, name):
        if not name:
            return ''

        # Chuyển về lowercase nhưng giữ nguyên dấu và ký tự đặc biệt
        normalized = name.lower().strip()

        # Thay thế nhiều khoảng trắng thành một khoảng trắng
        normalized = ' '.join(normalized.split())

        return normalized

    def search_department(self, department_name):
        if not department_name:
            return False

        if department_name == "Tổng giám đốc" or department_name == "Phó tổng  giám đốc":
            department_name = "Ban giám đốc"
        elif department_name == "GĐ. Nhân Sự":
            department_name = "Nhân sự"
        elif department_name == "GĐ. Tài Chính":
            department_name = "Kinh doanh"
        elif department_name == "Kiểm soát tổng hợp - Kiêm trợ lý TGĐ":
            department_name = "Kế toán"
        elif department_name == "GĐ. Sản Xuất":
            department_name = "Kỹ thuật"
        elif department_name == "TT.Bảo Vệ":
            department_name = "Bảo vệ"
        elif department_name == "GĐ.Kinh Doanh" or department_name == "PGĐ. Tài Chính - Kiêm PGĐ. Kinh doanh" or department_name == "GĐ.Marketing - Kiêm trợ lý TGĐ":
            department_name = "Kinh doanh"
        elif department_name == "Trưởng Kho NVL":
            department_name = "Kho Nguyên Liệu"

        normalized_search = self.normalize_department_name(department_name)
        departments = self.env['hr.department'].search([
            '|',
            ('name', '=ilike', department_name),
            ('name', '=ilike', department_name.lower())
        ], order='parent_path desc, create_date asc, id asc')
        for dept in departments:
            normalized_dept = self.normalize_department_name(dept.name)
            if normalized_dept == normalized_search:
                return dept
        return None

    def check_and_import_employee(self):
        if not self.attendance_file:
            return

        workbook = xlrd.open_workbook(file_contents=base64.b64decode(self.attendance_file))
        sheet = workbook.sheet_by_index(0)

        # Get employee codes and day columns from excel file
        employee_data = {}
        data_start_row = 1

        # Xác định các cột ngày trong file
        headers = [sheet.cell_value(0, col).lower() for col in range(sheet.ncols)]
        day_columns = {}
        for col, header in enumerate(headers):
            if 'day ' in header:
                day = int(header.split()[1])
                day_columns[day] = col

        # Lấy thông tin nhân viên từ file excel
        for row_idx in range(data_start_row, sheet.nrows):
            employee_code = str(sheet.cell_value(row_idx, 0)).strip()
            if isinstance(employee_code, float):
                employee_code = str(int(employee_code))
            employee_code = employee_code.replace('.0', '').replace('-', '')

            if employee_code:
                employee_name = str(sheet.cell_value(row_idx, 1)).strip()
                department_name = str(sheet.cell_value(row_idx, 2)).strip()

                first_working_day = 1
                for day in sorted(day_columns.keys()):
                    value = str(sheet.cell_value(row_idx, day_columns[day])).strip()
                    if value:
                        if value.upper().startswith('B'):
                            first_working_day += 1
                            continue
                        else:
                            break

                # Lưu thông tin vào dictionary
                employee_data[employee_code] = {
                    'name': employee_name,
                    'department_name': department_name,
                    'first_working_day': first_working_day
                }

        # Update inactive status for employees not in file
        missing_employees = self.env['hr.employee'].search([
            ('employee_code', 'not in', list(employee_data.keys()))
        ])
        if missing_employees:
            missing_employees.write({
                'is_active': False,
                'active': False
            })

        # Check và tạo nhân viên mới nếu chưa tồn tại
        distribution_date = self.month

        for emp_code, emp_info in employee_data.items():
            existing_employee = self.env['hr.employee'].with_context(active_test=False).search([
                ('employee_code', '=', emp_code)
            ], limit=1)

            department_name = emp_info['department_name']
            department = self.search_department(department_name)
            # Không có phòng ban sẽ tự tạo
            if not department:
                department = self.env['hr.department'].create({
                    'name': department_name
                })
            if not existing_employee:
                # Tính ngày vào làm từ ngày đầu tiên có dữ liệu
                join_date = distribution_date.replace(day=emp_info['first_working_day'])
                if emp_info['first_working_day'] == 1:
                    join_date = join_date - relativedelta(months=1)

                # Tạo nhân viên mới
                self.env['hr.employee'].create({
                    'employee_code': emp_code,
                    'name': emp_info['name'],
                    'company_id': self.env.company.id,
                    'department_id': department.id if department else False,
                    'join_date': join_date,
                    'end_date': None,
                    'is_active': True,
                    'active': True,
                })
            else:
                if emp_info['first_working_day'] != 1:
                    join_date = distribution_date.replace(day=emp_info['first_working_day'])
                    existing_employee.write({
                        'join_date': join_date,
                        'department_id': department.id if department else False,
                        'is_active': True,
                        'active': True,
                    })
                else:
                    existing_employee.write({
                        'department_id': department.id if department else False,
                        'is_active': True,
                        'active': True,
                    })

        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def gen_shifts_attendance_data(self):
        department_shifts = {}
        SHIFT_DEPARTMENTS = ('Bảo vệ', 'Cửa Hàng', 'Nhà Hàng', 'Kinh Doanh', 'Kinh doanh')
        for distribution_line in self.distribution_line_ids:
            if any(dept in distribution_line.department_name for dept in SHIFT_DEPARTMENTS):
                dept_id = distribution_line.department_id.id
                if dept_id not in department_shifts:
                    # Khởi tạo dict cho phòng ban
                    department_shifts[dept_id] = {}
                    # Khởi tạo counter cho từng ngày
                    for day in range(1, self.days_in_month + 1):
                        department_shifts[dept_id][day] = {'1': 0, '2': 0}

        for distribution_line in self.distribution_line_ids:
            shift = '1'
            if any(dept in distribution_line.department_name for dept in SHIFT_DEPARTMENTS):
                dept_id = distribution_line.department_id.id
                for day in range(1, self.days_in_month + 1):
                    status_value = getattr(distribution_line, f'day_{day}')
                    if status_value == 'X':
                        current_shifts = department_shifts[dept_id][day]
                        # If significant imbalance exists, prefer the lesser used shift
                        if abs(current_shifts['1'] - current_shifts['2']) > 2:
                            if current_shifts['1'] < current_shifts['2']:
                                shift = '1'
                            else:
                                shift = '2'
                        else:
                            # Otherwise random assignment
                            shift = random.choice(['1', '2'])
                        department_shifts[dept_id][day][shift] += 1
                        setattr(distribution_line, f'day_{day}_shift', shift)
            else:
                for day in range(1, self.days_in_month + 1):
                    status_value = getattr(distribution_line, f'day_{day}')
                    if status_value == 'X':
                        setattr(distribution_line, f'day_{day}_shift', shift)
        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def distribution_late_and_overtime(self):
        for distribution_line in self.distribution_line_ids:
            #reset giá trị đã phân phối đi trễ và tăng ca
            values = {}
            for day in range(1, 32):
                values[f'day_{day}_late'] = None
                values[f'day_{day}_overtime'] = None
            distribution_line.write(values)

            # Phân phối lại các phút đến trễ
            if distribution_line.late_minutes:
                distribution_line.distribute_late_minutes(distribution_line.late_minutes)

            # Phân phối lại các giờ tăng ca thành phút
            if distribution_line.overtime_hours:
                distribution_line.distribute_overtime_minutes(distribution_line.overtime_hours * 60)
        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def gen_checkin_checkout_attendance_data(self):
        for distribution_line in self.distribution_line_ids:
            # Sinh lại giờ vào/ra
            distribution_line.gen_checkin_check_out(distribution_line.employee_id)
            # Tính lại ngày công thực tế
            distribution_line._compute_actual_workdays()
        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def update_group_for_attendance_data(self):
        """
        Cập nhật group_code cho hr.monthly.attendance.distribution.line dựa trên nhóm nhân viên
        """
        for distribution_line in self.distribution_line_ids:
            # Lấy danh sách nhóm của nhân viên
            employee = distribution_line.employee_id
            if employee.employee_group_ids:
                # Lấy code của nhóm đầu tiên làm group_code
                # Ưu tiên theo thứ tự: 18_DUOI_18 -> 19A_CO_THAI -> 19_NUOI_CON_NHO
                priority_codes = ["18_DUOI_18", "19A_CO_THAI", "19_NUOI_CON_NHO"]
                group_code = ''

                # Tìm code theo thứ tự ưu tiên
                for priority_code in priority_codes:
                    matching_group = employee.employee_group_ids.filtered(lambda g: g.code == priority_code)
                    if matching_group:
                        group_code = matching_group[0].code
                        break

                # Nếu không có code ưu tiên, lấy code đầu tiên
                if not group_code and employee.employee_group_ids:
                    group_code = employee.employee_group_ids[0].code

                distribution_line.write({
                    'group_code': group_code
                })
            else:
                # Nếu nhân viên không thuộc nhóm nào, xóa group_code nếu có
                distribution_line.write({
                    'group_code': ''
                })

        return {'type': 'ir.actions.client', 'tag': 'reload'}

    def check_consecutive_workdays(self):
        """
        Run consecutive workdays validation for all distribution lines of the month.
        This will check if any employees have more than 6 consecutive working days
        and update the has_too_many_consecutive_workdays field accordingly.
        """
        for record in self:
            # Call _compute_consecutive_workdays_validation on all distribution lines
            record.distribution_line_ids._compute_consecutive_workdays_validation()

            # Count employees with too many consecutive workdays
            violation_count = len(record.distribution_line_ids.filtered(lambda l: l.has_too_many_consecutive_workdays))

            if violation_count > 0:
                message = _('%d employees have more than 6 consecutive workdays.') % violation_count
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Consecutive Workdays Check'),
                        'message': message,
                        'sticky': False,
                        'type': 'warning',
                    }
                }
            else:
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Consecutive Workdays Check'),
                        'message': _('No consecutive workday violations found.'),
                        'sticky': False,
                        'type': 'success',
                    }
                }

    def check_last_leave_day(self):
        for record in self:
            record.distribution_line_ids._compute_last_leave_day()
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Success'),
                    'message': _('success'),
                    'sticky': False,
                    'type': 'success',
                }
            }

    def check_rest_balance(self):
        """
        Cân bằng ngày nghỉ trong phòng (chênh ≤ ±1 ngày so với trung bình).
        Số NV nghỉ mỗi ngày không được chênh quá ±1 so với trung bình phòng.
        """
        self.ensure_one()
        dept_groups = {}
        for line in self.distribution_line_ids:
            dept = line.department_id
            if not dept:
                continue
            dept_groups.setdefault(dept, []).append(line)

        violation_depts = 0
        detail_lines = []
        for dept, members in dept_groups.items():
            if len(members) < 3:
                continue
            total_members = len(members)

            daily_rest = [0] * (self.days_in_month + 1)
            for line in members:
                for day in range(1, self.days_in_month + 1):
                    val = getattr(line, f'day_{day}', '')
                    if val and val != 'X':
                        daily_rest[day] += 1

            # Bỏ qua ngày đặc biệt (tất cả NV đều nghỉ — NL, lễ...)
            special_days = {
                day for day in range(1, self.days_in_month + 1)
                if daily_rest[day] >= total_members
            }

            checked_days = self.days_in_month - len(special_days)
            if checked_days == 0:
                continue

            total_rest = sum(
                daily_rest[day]
                for day in range(1, self.days_in_month + 1)
                if day not in special_days
            )
            if total_rest == 0:
                continue
            avg = total_rest / checked_days

            bad_days = []
            for day in range(1, self.days_in_month + 1):
                if day in special_days:
                    continue
                deviation = daily_rest[day] - avg
                if deviation > 1 or deviation < -1:
                    bad_days.append((day, daily_rest[day], deviation))

            if bad_days:
                violation_depts += 1
                special_note = f" (bỏ qua {len(special_days)} ngày đặc biệt)" if special_days else ''
                summary = (
                    f"📊 {dept.name}: {total_members} NV — "
                    f"TB {avg:.1f} nghỉ/ngày — {len(bad_days)} ngày vi phạm{special_note}"
                )
                detail_lines.append(summary)
                for day, count, dev in bad_days:
                    sign = '+' if dev > 0 else ''
                    detail_lines.append(
                        f"  Ngày {day}: {count} người nghỉ "
                        f"({sign}{dev:.1f} so với TB)"
                    )

        if violation_depts == 0:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Cân bằng ngày nghỉ',
                    'message': 'Tất cả phòng ban đạt cân bằng ngày nghỉ (±1).',
                    'sticky': False,
                    'type': 'success',
                }
            }

        message = f'{violation_depts} phòng vi phạm cân bằng ngày nghỉ:\n' + '\n'.join(detail_lines)
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Cân bằng ngày nghỉ',
                'message': message,
                'sticky': True,
                'type': 'warning',
            }
        }

    def generate_distribution(self):
        """Generate attendance distribution for selected month."""
        for record in self:
            result = self.env['hr.monthly.attendance.distribution.line'].generate_distribution(record.id)
            if result.get('success'):
                self.message_post(body=_("Distribution generated successfully"))
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Thành công'),
                        'message': result.get('message', 'Đã tạo phân bổ ngày công thành công'),
                        'sticky': False,
                        'type': 'success',
                    }
                }
            else:
                self.message_post(body=_("Error generating distribution: %s") % result.get('error', 'Unknown error'))
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Lỗi'),
                        'message': result.get('error', 'Có lỗi xảy ra khi tạo phân bổ ngày công'),
                        'sticky': True,
                        'type': 'danger',
                    }
                }
