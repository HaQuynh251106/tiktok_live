# Mở game và nối TikTok LIVE

1. Cài **Node.js 24 LTS** từ https://nodejs.org/en/download/ (tối thiểu Node 22).
2. Giải nén toàn bộ source. Mac: nháy đúp **chay.command**. Windows: nháy đúp **Mo-Neon-Room.cmd**. Lần đầu cần Internet để tự cài thư viện đã khoá phiên bản.
3. Trang quản trị tự mở: http://127.0.0.1:8790/admin.html#tiktok. Giữ cửa sổ Terminal mở.
4. Mở mục **Thử mô phỏng**: đặt tên, gửi bình luận **vào**, bấm **Thả tim mô phỏng** hoặc **Tặng quà mô phỏng** để xem phản ứng trên sàn. Đổi nhân vật, thử cánh, máy bay trong **Quà & hiệu ứng**. Nhạc SoundCloud quản lý ở **Nhạc**.
5. Đưa hình http://127.0.0.1:8790/song vào cảnh dọc 1080 × 1920 của phần mềm phát sóng. Nếu có nguồn trình duyệt, dùng link này; nếu không, thu cửa sổ sân khấu. Nguồn nhạc riêng: http://127.0.0.1:8790/music.html.
6. **Tự bắt đầu LIVE trong TikTok LIVE Studio.** Công cụ chỉ nhận tương tác và tạo hiệu ứng; không tự phát LIVE, không cần stream key.
7. Quay lại **TikTok LIVE**, nhập tên sau dấu **@** của tài khoản đang phát rồi bấm **NỐI TIKTOK LIVE**. Chờ nhãn **ĐANG NHẬN LIVE**.
8. Từ tài khoản người xem, bình luận **vào** để thành nhân vật. Có thể đổi từ này, hoặc bật tự thêm người vừa vào LIVE. Sàn tối đa 120 nhân vật.
9. Thả tim: mặc định đủ 20 tim mỗi người tạo lượt nhảy. Theo dõi: camera đến người đó. Hai loại này không cộng TOP tặng quà.
10. Quà được khớp theo ID trong bảng quà, rồi theo tên chính xác khi chưa gán ID. Quà mới hiện trong **Quà TikTok vừa nhận**. Bấm **Gán hiệu ứng**, chọn kiểu cánh/máy bay/chuyển động, bấm **Lưu bảng quà**, rồi thử tặng lại. Quà chưa gán không cộng TOP. TOP hiện tính **số quà**, không phải số xu.

Phòng thử và phòng LIVE tách riêng. Nối thành công mở phòng thật, không mang người mẫu/quà mẫu vào. Ngắt giữ người và TOP của phiên. Nối lại cùng mã phòng tiếp tục phiên đó; mã phòng mới mở TOP mới. Khởi động lại server không tự nối và không giữ TOP của phiên thật.

## Khi không nối được

- **Tài khoản chưa LIVE:** dùng đúng @tên, tự bắt đầu LIVE rồi bấm Nối lại. Trang game không mở được một phiên LIVE thay bạn.
- **Cần chữ ký / hết hạn mức:** mở **Khoá ký (tuỳ chọn)**, nhập API key của dịch vụ **Euler Stream** nếu bạn có. Không nhập mật khẩu TikTok, cookie hay stream key. Khoá chỉ lưu ở `data/tiktok-config.json` trên máy và gửi tới dịch vụ ký; không có trong API đọc cấu hình hoặc màn hình lên sóng. Để trống giữ khoá cũ; tick Xoá khoá để gỡ.
- **Mất mạng:** tự thử nối lại tối đa 3 lần (10, 20, 40 giây). Ngắt hoặc LIVE kết thúc sẽ dừng nối lại. Nếu vẫn lỗi, kiểm tra mạng và bấm Nối lại.
- **Node cũ:** cài Node 24 LTS rồi đóng/mở lại Terminal. Một số thư viện phụ yêu cầu Node 22 dù connector ghi Node 20.
- **Mac không cho nháy đúp:** trong Terminal ở thư mục source chạy `chmod +x chay.command`, sau đó `./chay.command`. Không mở trực tiếp các file HTML.
- **Cổng đang dùng:** mở lại trang admin đang chạy; Ctrl+C trong Terminal của game để dừng phiên cũ.

Thư viện nhận LIVE là **tiktok-live-connector 2.5.0**, không chính thức. TikTok và dịch vụ ký có thể thay đổi hoặc giới hạn kết nối; thông báo trong admin cho biết kết quả thực tế. Không cần đăng nhập TikTok trong game.
