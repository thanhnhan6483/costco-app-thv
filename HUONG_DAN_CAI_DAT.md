# HƯỚNG DẪN CÀI ĐẶT
## Phần mềm Quản Lý Chấm Công – Tân Huê Viên

---

## YÊU CẦU HỆ THỐNG

- Hệ điều hành: Windows 10 / 11 (64-bit)
- RAM: tối thiểu 4GB
- Dung lượng ổ cứng: tối thiểu 2GB trống
- Kết nối Internet (chỉ cần cho lần cài đặt đầu tiên)

---

## BƯỚC 1 – CÀI ĐẶT NODE.JS

1. Truy cập: https://nodejs.org
2. Tải phiên bản **LTS** (nút màu xanh lá)
3. Chạy file `.msi` vừa tải, nhấn **Next** liên tục đến khi hoàn tất
4. Khởi động lại máy tính

> Kiểm tra cài đặt thành công: mở **Command Prompt**, gõ `node -v` → hiện số phiên bản là OK.

---

## BƯỚC 2 – TẢI PHẦN MỀM

1. Truy cập: https://github.com/thanhnhan6483/costco-app-thv/tree/release
2. Nhấn nút **Code** → **Download ZIP**
3. Giải nén file ZIP vào thư mục bất kỳ, ví dụ: `C:\THV-ChamCong`

> Hoặc nếu đã có Git: `git clone -b release https://github.com/thanhnhan6483/costco-app-thv.git`

---

## BƯỚC 3 – CHẠY PHẦN MỀM

1. Vào thư mục vừa giải nén
2. Nhấn đúp vào file **`START_APP.bat`**
3. Lần đầu chạy sẽ tự động cài đặt và build (~3–5 phút), **không tắt cửa sổ**
4. Khi thấy dòng `Ung dung dang chay tai: http://localhost:3000` → trình duyệt tự mở
5. Đăng nhập bằng tài khoản được cấp

> **Từ lần sau:** chỉ cần nhấn `START_APP.bat`, phần mềm khởi động trong vài giây.

---

## ĐĂNG NHẬP LẦN ĐẦU

| Tài khoản | Mật khẩu |
|-----------|----------|
| admin     | admin123 |

> ⚠️ Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu tại **Quản lý tài khoản**.

---

## LƯU Ý

- **Không tắt cửa sổ đen** khi đang dùng phần mềm — đó là server đang chạy
- Dữ liệu lưu tại thư mục cài đặt, file `*.duckdb` — **sao lưu định kỳ**
- Nhiều máy trong cùng mạng LAN có thể truy cập qua IP máy chủ: `http://<IP-may-chu>:3000`

---

## HỖ TRỢ

Liên hệ kỹ thuật khi gặp sự cố cài đặt.
