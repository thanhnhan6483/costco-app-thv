// Month configuration type
export interface MonthEntry {
  id: string;
  label: string;       // Tên tháng tùy chọn (VD: "Tháng 5 - Chính thức")
  month: string;       // MM/YYYY
  fromDate: string;    // DD/MM/YYYY
  toDate: string;      // DD/MM/YYYY
  note: string;
  createdAt: string;
  locked: boolean;
}
