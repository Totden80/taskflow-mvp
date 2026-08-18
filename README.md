# TaskFlow MVP

MVP giao việc theo cây tài khoản, chạy thử không cần cài framework.

## Chạy thử

Yêu cầu Node.js 18+.

```bash
npx serve .
```

Mở `http://localhost:4173`.

Tài khoản demo: `admin`, `cap1`, `cap2`; mật khẩu: `123456`.

Dữ liệu demo được lưu trong `localStorage` của trình duyệt để có thể thử nhanh. `schema.sql` là cấu trúc MySQL nền tảng cho bước chuyển sang PHP/MySQL; bản này chưa kết nối database thật. Khi deploy Vercel, ứng dụng chạy dạng frontend tĩnh.

## Supabase

Bản hiện tại đã kết nối Supabase cho hồ sơ tài khoản và nhóm công việc. Người dùng đầu tiên chọn **Đăng ký Admin đầu tiên** trên ứng dụng, xác nhận email nếu Supabase yêu cầu, rồi đăng nhập. Admin có thể tạo, sửa, khóa/xóa tài khoản và quản lý nhóm công việc. Schema nằm tại `supabase/taskflow-schema.sql`; Edge Function quản trị nằm tại `supabase/functions/task-admin/index.ts`.
