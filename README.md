# Neon Room — Windows + OBS

Game sàn nhảy sticker dạng web, chạy cục bộ trên Windows 10/11 bằng Node.js.
Có 8 nhân vật với 4 tư thế mỗi nhân vật, sàn phối cảnh có chiều sâu,
camera tiến/lùi và xoay, cùng 9 hiệu ứng thử.
**Hiện là bản mô phỏng, chưa kết nối TikTok và không gửi hoặc nhận quà thật.**

## Chạy trên Windows

1. Cài [Node.js](https://nodejs.org/) phiên bản 20 trở lên; có thể chọn bản LTS tại trang chủ.
2. Tải source bằng **Code → Download ZIP**, sau đó **Extract All / Giải nén tất cả**.
3. Mở thư mục vừa giải nén, nhấp đúp **`Mo-Neon-Room.cmd`**.
4. Trình duyệt tự mở [http://127.0.0.1:8790/](http://127.0.0.1:8790/).
   Nếu không tự mở, truy cập địa chỉ đó bằng Edge hoặc Chrome.
5. Giữ cửa sổ lệnh mở trong lúc chơi. Nhấn **Ctrl+C** để dừng; nếu Windows hỏi
   `Terminate batch job (Y/N)?`, nhập `Y`.

Không cần `npm install`; source dùng các thư viện có sẵn của Node.js.
Không mở trực tiếp `dist/index.html` bằng cách nhấp đúp.

Nếu dùng Terminal hoặc PowerShell tại thư mục source:

```powershell
npm start
```

Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd start` hoặc chạy `Mo-Neon-Room.cmd`.

## Thêm vào OBS trên cùng máy Windows

Trong OBS, chọn **Sources → + → Browser**:

| Thuộc tính | Giá trị |
| --- | --- |
| URL | `http://127.0.0.1:8790/?overlay=1` |
| Width | `1080` |
| Height | `1920` |
| FPS | `30` |

Đặt khung hình OBS thành 1080 × 1920. Giữ tùy chọn **Shutdown source when not
visible** ở trạng thái tắt để phòng tiếp tục chạy.
Mở bảng điều khiển bằng Edge/Chrome để chọn người chơi và bấm quà thử;
Browser Source trong OBS nhận cùng trạng thái qua máy chủ cục bộ.

Nút âm thanh phát nhịp tổng hợp ở trang điều khiển. Muốn đưa nhịp này vào buổi
phát, thu âm trình duyệt đó trong OBS; âm thanh không tự đồng bộ sang overlay.
Game và ảnh chạy cục bộ; nếu không có Internet, font dùng phông dự phòng.

## Nhân vật và hiệu ứng

- **Nấm Lém, Gấu Quậy, Nấm Hồng, Mèo Ngầu, Thỏ Tăng Động, Shiba Chảnh,
  Vịt Quậy, Capy Thảnh Thơi**: chọn trực tiếp hoặc đổi lần lượt.
- **Camera**: tiến tới đúng vị trí nhân vật, xoay nhẹ khi cận rồi lùi ra toàn sàn.
- **Đổi nhân vật**: đổi sticker của người chơi.
- **Đi vòng**: chạy quanh sàn.
- **Phi công**: lái máy bay hồng.
- **Ghép đôi**: hai nhân vật cùng xuất hiện với trái tim.
- **Vua**: cánh bạc, vương miện và hào quang lưu theo người chơi.
- **Đại bàng**: đôi cánh vàng vẫy, tia sáng và hào quang lưu theo người chơi.
- **Nhảy một cái**: bật cao với vòng xung lực.
- **Ngộ Không**: hóa thân tạm thời; hết lượt trở về sticker đã chọn.

Phòng tối đa 120 nhân vật; hàng đợi tối đa 100 nhóm hiệu ứng. Quà chạy tuần tự.
Nút **40 người / 100 người** thêm người mẫu vào sàn, giữ người và quà hiện có.
Vị trí không phụ thuộc số người: thêm người không thu nhỏ toàn bộ nhân vật.
Nhân vật ở xa trông nhỏ hơn theo phối cảnh. Sàn là cảnh phối 2D trong không
gian có camera, không phải mô hình nhân vật 3D của game trong video tham khảo.

Quà Vua cộng 3 điểm VIP, Đại bàng cộng 10 điểm; ba người nhiều điểm nhất đứng
trên bục. Cánh vẫn còn khi hết cảnh zoom; cánh vàng không bị đổi về cánh bạc
khi nhận thêm quà Vua. Đây là quy tắc mô phỏng có thể chỉnh trong `GIFTS`.
Trong mục camera, **Tự động** theo lượt quà, **Toàn sàn** giữ góc rộng,
**Cận người chọn** giữ camera ở người đang chọn. OBS theo cùng chế độ.

Combo ×1/×5/×10 là số quà mô phỏng, không phải số xu.
Trạng thái phòng hiện lưu trong bộ nhớ; tắt máy chủ sẽ mất phiên thử.

## Nạp thêm sticker động

Chọn **Nạp sticker GIF / WebP / PNG**, rồi chọn tệp sticker đã lưu trên máy.
Game đọc từng khung và thời gian của GIF/WebP động, giữ animation gốc thay vì
chuyển thành một ảnh đứng. Tệp PNG tĩnh cũng dùng làm nhân vật được.
Sau khi nạp, chọn người chơi rồi bấm sticker mới; overlay OBS tự nhận bộ này.

Mỗi tệp tối đa **8 MB, 60 khung**, tối đa **16 sticker tự nạp**. Khung được thu
về cạnh dài tối đa 256 px để giảm bộ nhớ khi sàn đông người. Dùng Chrome/Edge
hoặc phiên bản OBS có hỗ trợ `ImageDecoder`; trình duyệt thiếu bộ giải mã sẽ
hiện thông báo, không tự biến animation thành ảnh tĩnh.

Nếu muốn dùng sticker Zalo, bạn cần có tệp GIF/WebP/PNG gốc phù hợp để nạp.
Bản source có bộ nhân vật tạo riêng bằng ImageGen, chưa kèm sticker gốc Zalo.
Tệp tự nạp nằm trong `dist/assets/custom/`, giữ lại sau khi tắt server và được
loại khỏi Git. Muốn chuyển sang máy Windows khác, sao chép cả thư mục này.

## Kiểm tra và tạo bộ source

```powershell
npm test
npm run build
```

Bộ source sẵn chạy được tạo tại **`build/Neon-Room-Windows`**, gồm launcher,
server, frontend, PNG, mã kiểm tra và hướng dẫn. Không cần biên dịch thành `.exe`.
Workflow GitHub Actions kiểm tra launcher `.cmd`, API, sự đồng bộ SSE và ảnh
trên Windows với Node.js 24. Trạng thái chạy xem trong tab **Actions** của repo.

## Cấu trúc mã

| Đường dẫn | Nội dung |
| --- | --- |
| `Mo-Neon-Room.cmd` | Kiểm tra Node.js, khởi động server, tự mở trình duyệt |
| `server.mjs` | HTTP, API và SSE, chỉ lắng nghe tại `127.0.0.1` |
| `dist/app.js` | Điều khiển, nạp sticker và đồng bộ trạng thái |
| `dist/room-core.mjs` | Người chơi, combo, hàng đợi và tính quà |
| `dist/scene-math.mjs` | Tọa độ sàn, phép chiếu và đường chuyển camera |
| `dist/scene.mjs` | Dựng sàn, ánh sáng, cánh, nhân vật và camera |
| `dist/stickers.mjs` | Tách khung sprite và giải mã GIF/WebP động |
| `sticker-store.mjs` | Lưu sticker tự nạp và danh mục cục bộ |
| `dist/assets/` | PNG nhân vật, máy bay, Ngộ Không và cánh vàng |
| `ASSET-NOTES.txt` | Nguồn tham khảo và prompt tạo PNG bằng ImageGen |
| `ASSET-PROMPTS-V4.json` | Prompt chính xác cho cánh vàng và bộ thú mới |
| `scripts/build.mjs` | Tạo bộ source Windows bằng Node.js |

## Điểm nhận sự kiện để phát triển tiếp

Chưa có bộ đọc sự kiện TikTok thật. Một bridge có thể gửi sự kiện chuẩn hóa tới
`POST http://127.0.0.1:8790/api/event`:

```json
{
  "id": "unique-message-id",
  "user": {"id": "stable-viewer-id", "name": "Tên người xem"},
  "gift": "rose",
  "repeatCount": 1,
  "streakId": "unique-streak-id"
}
```

`gift`: `rose`, `tiktok`, `icecream`, `doughnut`, `pair`, `crown`, `wings`, `jump`, `wukong`.
`repeatCount` là số cộng dồn trong cùng `streakId`: gửi 1, rồi 3, rồi 3 chỉ cộng
3 quà. Sự kiện có `id` trùng được bỏ qua. Dùng ID người xem ổn định.
API trả lỗi 400 với `room_full` hoặc `queue_full` khi hết chỗ; bridge cần xử lý
và thử lại khi phù hợp. Không nhập mật khẩu TikTok vào game.

## Khi không mở được

- **Không tìm thấy Node.js:** cài Node.js, đóng cửa sổ lệnh cũ rồi chạy lại `.cmd`.
- **Không tìm thấy server hoặc PNG:** giải nén toàn bộ thư mục trước khi chạy.
- **Cổng 8790 đang dùng:** mở lại địa chỉ game nếu đã chạy, hoặc dừng phiên cũ.
- **Đổi cổng trong PowerShell:** `$env:NEON_ROOM_PORT=8791; node server.mjs --open`.
  Khi đó đổi URL trong OBS sang cổng 8791 tương ứng.
- **Overlay trống:** giữ server chạy, kiểm tra URL và bấm Refresh Browser Source.

Bộ nhân vật PNG được tạo riêng bằng ImageGen theo phong cách sticker meme.
Các mẫu tham khảo chỉ dùng định hướng; bộ source này không chứa dữ liệu phiên
chơi, thông tin đăng nhập hoặc tài nguyên gốc của live TikTok tham chiếu.
