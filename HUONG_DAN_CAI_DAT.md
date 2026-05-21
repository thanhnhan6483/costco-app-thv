# HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG COSTCO APP

---

## CÁCH 1 – Tự động (Khuyến nghị)

> Chỉ cần có kết nối Internet. File `START_APP.bat` sẽ tự cài mọi thứ.

1. Tải source code về máy (xem Cách 2 – Bước 1 nếu chưa có Git)
2. Mở thư mục vừa tải về
3. **Chuột phải** vào `START_APP.bat` → chọn **"Run as administrator"**
4. Chờ cài đặt tự động (lần đầu có thể mất 5–15 phút)
5. Trình duyệt tự mở tại `http://localhost:3000`

---

## CÁCH 2 – Cài đặt thủ công

### Bước 1 – Cài Git

1. Truy cập: https://git-scm.com/download/win
2. Tải file `.exe` (64-bit) và chạy cài đặt
3. Nhấn **Next** liên tục → **Install** → **Finish**
4. Kiểm tra: mở **Command Prompt**, gõ `git --version`

### Bước 2 – Cài Node.js

1. Truy cập: https://nodejs.org
2. Tải phiên bản **LTS** (khuyến nghị v20)
3. Chạy file `.msi` → nhấn **Next** liên tục → **Install** → **Finish**
4. Kiểm tra: mở **Command Prompt**, gõ `node --version`

### Bước 3 – Tải source code

Mở **Command Prompt** hoặc **Git Bash**, chạy lệnh:

```bash
git clone https://github.com/thanhnhan6483/costco-app-thv.git
cd costco-app-thv
```

### Bước 4 – Cài dependencies

```bash
npm install
```

> Lần đầu có thể mất 5–10 phút.

### Bước 5 – Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt, truy cập: **http://localhost:3000**

---

## CẬP NHẬT PHIÊN BẢN MỚI

Khi có bản cập nhật, mở **Command Prompt** trong thư mục ứng dụng:

```bash
git pull
npm install
```

Sau đó chạy lại `START_APP.bat` hoặc `npm run dev`.

---

## DỪNG ỨNG DỤNG

- Nhấn **Ctrl + C** trong cửa sổ đang chạy server
- Hoặc đóng cửa sổ Command Prompt

---

## LỖI THƯỜNG GẶP

| Lỗi | Cách xử lý |
|-----|-----------|
| Trang trắng / không load được | Chờ 10–15 giây rồi F5 lại |
| Cổng 3000 đã bị dùng | Tắt ứng dụng cũ, chạy lại `START_APP.bat` |
| Lỗi database khi khởi động | Chạy lại `START_APP.bat` (file sẽ tự dọn dẹp) |
| `npm install` lỗi | Kiểm tra kết nối Internet, chạy lại |

---

## YÊU CẦU HỆ THỐNG

- Windows 10/11 (64-bit)
- RAM: tối thiểu 4GB
- Dung lượng trống: tối thiểu 2GB
- Kết nối Internet (lần đầu cài đặt)
