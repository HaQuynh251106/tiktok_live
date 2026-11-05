# Mở game và nối TikTok LIVE

1. Cài **Node.js 24 LTS** từ https://nodejs.org/en/download/ (tối thiểu Node 22).
2. Giải nén toàn bộ source. Mac: nháy đúp **chay.command**. Windows: nháy đúp **Mo-Neon-Room.cmd**. Lần đầu cần Internet để tự cài thư viện đã khoá phiên bản.
3. Trang quản trị tự mở: http://127.0.0.1:8790/admin.html#tiktok. Giữ cửa sổ Terminal mở.
4. Mở mục **Thử mô phỏng**: đặt tên, gửi bình luận **hey**, bấm **Thả tim mô phỏng** hoặc **Tặng quà mô phỏng** để xem phản ứng trên sàn. Đổi nhân vật, thử cánh, máy bay trong **Quà & hiệu ứng**. Nhạc SoundCloud quản lý ở **Nhạc**.
5. Đưa hình http://127.0.0.1:8790/song vào cảnh dọc 1080 × 1920 của phần mềm phát sóng. Nếu có nguồn trình duyệt, dùng link này; nếu không, thu cửa sổ sân khấu. Nguồn nhạc riêng: http://127.0.0.1:8790/music.html.
6. **Tự bắt đầu LIVE trong TikTok LIVE Studio.** Công cụ chỉ nhận tương tác và tạo hiệu ứng; không tự phát LIVE, không cần stream key.
7. Quay lại **TikTok LIVE**, nhập tên sau dấu **@** của tài khoản đang phát rồi bấm **NỐI TIKTOK LIVE**. Chờ nhãn **ĐANG NHẬN LIVE**.
8. Từ tài khoản người xem, bình luận **hey** để thành nhân vật. Có thể đổi từ này, hoặc bật tự thêm người vừa vào LIVE. Sàn tối đa 120 nhân vật.
9. Thả tim: mặc định đủ 20 tim mỗi người tạo lượt nhảy. Theo dõi: camera đến người đó. Hai loại này không cộng TOP tặng quà.
10. Quà được khớp theo ID trong bảng quà, rồi theo tên chính xác khi chưa gán ID. Quà mới hiện trong **Quà TikTok vừa nhận**. Bấm **Gán hiệu ứng**, chọn kiểu cánh/máy bay/chuyển động, bấm **Lưu bảng quà**, rồi thử tặng lại. Quà chưa gán không cộng TOP. TOP tính **tổng xu**: giá xu mỗi quà × số lượng mới phát sinh.

Phòng thử và phòng LIVE tách riêng. Mỗi phòng mới có sẵn **20 NPC nền** với tên hiển thị tự nhiên như Minh Anh, Bé Mây ☁️, Mèo Mướp, Bắp 🌽 để sàn không trống. NPC không vào TOP tặng quà, không làm tăng bộ đếm người xem TikTok; khi đủ 120 nhân vật, NPC nhường chỗ cho người xem thật. Nối thành công mở phòng thật với 20 NPC mới, không mang quà mẫu/TOP mẫu vào. Ngắt giữ người và TOP của phiên. Nối lại cùng mã phòng tiếp tục phiên đó; mã phòng mới mở TOP mới. Khởi động lại server không tự nối và không giữ TOP của phiên thật.

## Quà TikTok và TOP theo xu

Trong **Quà & hiệu ứng**, tìm trong 849 quà theo tên hoặc ID → **Thêm từ danh mục** → chọn chuyển động → **Lưu bảng quà**. Có sẵn 14 ánh xạ. Xu / quà dùng trong mô phỏng; sự kiện LIVE có giá sẽ ưu tiên giá thật. TOP trên bục, bảng và tên nhân vật đều tính tổng xu. Mặc định máy bay dùng Confetti 100 xu; cánh và các hiệu ứng khác 99–199 xu, còn ba quà nhỏ 1 xu. Ví dụ 1 Confetti = 100 xu; 50 Rose = 50 xu. Giá và ID vẫn đúng danh mục TikTok. Combo không cộng trùng.

Danh mục tham khảo được đối chiếu ngày 05/11/2026, chưa xác minh riêng theo phòng LIVE Việt Nam. Quà cũ của bản mô phỏng chưa có giá sẽ không tự quy đổi xu. Xem nguồn và bảng ID đầy đủ trong README.md.

## Khi không nối được

- **Lỗi chữ ký ở bản cũ dù tài khoản đang LIVE:** dùng bản **0.9.3 trở lên** rồi bấm Nối lại. Bản cũ tải thêm danh mục quà của phòng trước khi kết nối; bước này gọi chức năng ký có thể cần gói Business của Euler Stream. Bản mới bỏ bước phụ đó và đọc ID, tên, giá xu từ sự kiện quà nhận trực tiếp; nếu thiếu giá thì dùng bảng quà đã lưu. Không cần mua gói chỉ để sửa lỗi tải danh mục này.
- **Tài khoản chưa LIVE:** dùng đúng @tên, tự bắt đầu LIVE rồi bấm Nối lại. Trang game không mở được một phiên LIVE thay bạn.
- **Cần chữ ký / hết hạn mức:** mở **Khoá ký (tuỳ chọn)**, nhập API key của dịch vụ **Euler Stream** nếu bạn có. Không nhập mật khẩu TikTok, cookie hay stream key. Khoá chỉ lưu ở `data/tiktok-config.json` trên máy và gửi tới dịch vụ ký; không có trong API đọc cấu hình hoặc màn hình lên sóng. Để trống giữ khoá cũ; tick Xoá khoá để gỡ.
- **Mất mạng:** tự thử nối lại tối đa 3 lần (10, 20, 40 giây). Ngắt hoặc LIVE kết thúc sẽ dừng nối lại. Nếu vẫn lỗi, kiểm tra mạng và bấm Nối lại.
- **Node cũ:** cài Node 24 LTS rồi đóng/mở lại Terminal. Một số thư viện phụ yêu cầu Node 22 dù connector ghi Node 20.
- **Mac không cho nháy đúp:** trong Terminal ở thư mục source chạy `chmod +x chay.command`, sau đó `./chay.command`. Không mở trực tiếp các file HTML.
- **Cổng đang dùng:** mở lại trang admin đang chạy; Ctrl+C trong Terminal của game để dừng phiên cũ.

Thư viện nhận LIVE là **tiktok-live-connector 2.5.0**, không chính thức. TikTok và dịch vụ ký có thể thay đổi hoặc giới hạn kết nối; thông báo trong admin cho biết kết quả thực tế. Không cần đăng nhập TikTok trong game.

### Ảnh quà và chữ hiển thị (v0.9.4)

Trong **Quà & hiệu ứng**, mỗi dòng có ảnh quà TikTok theo ID, loại hiệu ứng và ô **Chữ hiển thị**. Ví dụ giữ Confetti → Phi công máy bay đỏ, nhập “Bay cùng anh”, rồi bấm **Lưu bảng quà**. Chữ mới xuất hiện ở bảng hướng dẫn dưới sân khấu, thông báo nhận quà và nhật ký; hiệu ứng bay, ID và giá xu giữ nguyên. Để trống ô này để dùng tên mặc định. Sửa chỉ áp dụng cho quà nhận sau đó.

14 ảnh quà mặc định được tải từ CDN TikTok và lưu cục bộ để chạy không cần tải ảnh ngoài. Nguồn và SHA-256 ở `dist/assets/gifts/sources.json`. Quà thêm ngoài danh sách ảnh có biểu tượng hộp quà dấu hỏi, không lấy ảnh của quà khác thay thế. Danh mục theo nguồn tham khảo; quà và giá trong từng phòng LIVE có thể khác.
