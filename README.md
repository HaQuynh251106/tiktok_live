# Neon Room — Windows + OBS

Game sàn nhảy sticker dạng web, chạy cục bộ trên Windows 10/11 bằng Node.js.
Có 8 nhân vật với 4 tư thế mỗi nhân vật, sân khấu **WebGL 3D thật** dùng Three.js,
camera di chuyển trong không gian, cùng 14 hiệu ứng thử và trang quản trị nhạc/quà.
**Hiện là bản mô phỏng, chưa kết nối TikTok và không gửi hoặc nhận quà thật.**

## Chạy trên Windows

1. Cài [Node.js](https://nodejs.org/) phiên bản 20 trở lên; có thể chọn bản LTS tại trang chủ.
2. Tải source bằng **Code → Download ZIP**, sau đó **Extract All / Giải nén tất cả**.
3. Mở thư mục vừa giải nén, nhấp đúp **`Mo-Neon-Room.cmd`**.
4. Trình duyệt tự mở [trang quản trị](http://127.0.0.1:8790/admin.html).
   Nếu không tự mở, truy cập địa chỉ đó bằng Edge hoặc Chrome.
5. Giữ cửa sổ lệnh mở trong lúc chơi. Nhấn **Ctrl+C** để dừng; nếu Windows hỏi
   `Terminate batch job (Y/N)?`, nhập `Y`.

Không cần `npm install`; source dùng các thư viện có sẵn của Node.js.
Thư viện dựng hình Three.js đã kèm trong `dist/vendor/`, không tải qua CDN khi chạy.
Sàn 3D cần trình duyệt/GPU hỗ trợ **WebGL 2**. Dùng Chrome, Edge hoặc OBS có
tăng tốc phần cứng. Nếu không khởi tạo được GPU, trang hiển thị lỗi rõ ràng.
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

Game và ảnh chạy cục bộ; nếu không có Internet, font dùng phông dự phòng.
Nhạc SoundCloud cần Internet và được phát qua trình nhúng chính thức.

## Trang quản trị: nhạc, quà và camera

Mở **Quản trị ♫** từ trang điều khiển hoặc truy cập `/admin.html`.
Khung sân khấu nằm cạnh bảng quản trị và theo cùng phòng với OBS.

### Nhạc SoundCloud

1. Chọn **Nhạc**, dán link đầy đủ của bài hát hoặc playlist trên
   `https://soundcloud.com/…`, chọn âm lượng rồi bấm **Lưu nhạc**.
   Có thể dán URL trình phát `w.soundcloud.com/player/?url=…` hoặc URL bài/playlist
   trên `api.soundcloud.com`. Link **Related tracks** trong Discover được đổi thành
   bài hát gốc; muốn phát cả danh sách, dùng link playlist `/người-đăng/sets/tên-list`.
   Trang tìm kiếm, hồ sơ và các mục Discover khác sẽ được báo lỗi khi lưu.
   Với link rút gọn `on.soundcloud.com`, mở link trước rồi chép địa chỉ đầy đủ.
2. Chọn **Trang admin này**, bấm **Phát nhạc**. Có nút tạm dừng, bài trước,
   bài tiếp theo (playlist) và lặp bài hiện tại. Trang hiển thị tên bài,
   người đăng và thời gian đã phát từ SoundCloud.
   Nếu vừa sửa link hoặc nơi phát, nút Phát tự lưu thay đổi trước khi mở nhạc.
3. Thu âm trình duyệt trong OBS nếu phát từ admin. Muốn OBS phát trực tiếp,
   thêm một **Browser Source riêng** có URL `http://127.0.0.1:8790/music.html`,
   bật **Control audio via OBS** nếu phiên bản OBS có tùy chọn này. Đặt nguồn
   nhạc bên dưới nguồn sân khấu, giữ **Shutdown source when not visible** tắt.
   Sau đó chọn **Nguồn nhạc OBS** trong admin, lưu và bấm Phát.
4. Nếu trình duyệt chặn âm thanh, bấm Play trực tiếp trong trình phát SoundCloud.
   Với OBS, dùng **Interact** ở nguồn nhạc để thao tác trình phát.
   Lỗi tải bài/URL không hợp lệ được hiển thị riêng, không báo thành lỗi chặn âm thanh.

Chỉ một cửa sổ nhận quyền phát; các admin khác và khung xem sân khấu im lặng.
Đóng cửa sổ đang phát sẽ tạm dừng nhạc; bấm Phát để chọn lại nơi phát. Đổi bài
hoặc nơi phát cũng dừng nhạc để bạn chủ động bắt đầu lại. Đổi âm lượng/tuỳ chọn
lặp rồi lưu sẽ giữ bài đang phát. Không tự phát sau khi khởi động lại máy chủ.
Để trống link rồi lưu để gỡ nhạc. Nhịp tổng hợp trên trang điều khiển tự tắt
khi SoundCloud phát. Bản này không phân tích BPM của âm thanh SoundCloud.

Tích hợp dùng [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget),
không cần API key và không tải/tách tệp nhạc. Bài bị chủ sở hữu hạn chế nhúng,
riêng tư hoặc không khả dụng có thể không phát được.
Khung sân khấu trong admin dùng chung dữ liệu với trang cha, không mở thêm
kết nối cập nhật riêng; mở nhiều admin và nguồn OBS không làm các khung xem trước
chiếm thêm kết nối HTTP của trình duyệt.
Xem thêm [Browser Source của OBS](https://obsproject.com/kb/browser-source).

### Quà & hiệu ứng

Đổi tên quà, chọn một trong 14 hiệu ứng, bật/tắt hoặc thêm quà mới (tối đa 32).
ID quà TikTok là tùy chọn để dùng với bridge sau này. Bấm **Lưu bảng quà** rồi
**Thử quà** để xem kết quả trên nhân vật đang chọn. Ví dụ: đổi hiệu ứng của
Hoa hồng sang **Cánh vàng VIP**, quà Hoa hồng tiếp theo sẽ mở cánh và cộng điểm VIP.
Lượt đang chạy và lượt đã xếp hàng giữ hiệu ứng đã nhận; quà mới theo bảng vừa lưu.
Khôi phục mặc định chỉ thay bản sửa, cần bấm Lưu bảng quà để áp dụng.

Mục **Phòng & camera** cho phép chọn người, đổi nhân vật, bỏ qua hiệu ứng,
chọn camera, màu sàn, thêm người mẫu và bật/tắt quà tự chạy.
Nạp sticker và thêm người có tên riêng vẫn nằm ở **Mở điều khiển**.

Cấu hình lưu ở `data/admin-config.json`, giữ lại sau khi tắt server và được
loại khỏi Git/bộ đóng gói. Muốn chuyển cấu hình sang máy khác, sao chép thư mục
`data/` cùng bộ source. Đây là trang quản trị cục bộ trên cùng máy với game.
Chưa có bộ nhận quà TikTok thật; bảng quy đổi đã sẵn sàng cho sự kiện mô phỏng/bridge.

## Nhân vật và hiệu ứng

- **Nấm Lém, Gấu Quậy, Nấm Hồng, Mèo Ngầu, Thỏ Tăng Động, Shiba Chảnh,
  Vịt Quậy, Capy Thảnh Thơi**: chọn trực tiếp hoặc đổi lần lượt.
- **Camera**: tiến tới đúng vị trí nhân vật, xoay nhẹ khi cận rồi lùi ra toàn sàn.
- **Đổi nhân vật**: đổi sticker của người chơi.
- **Đi vòng**: chạy quanh sàn.
- **Phi công**: lái máy bay hai tầng cánh đỏ, cánh quạt quay, cất cánh và bay một vòng rộng quanh sàn trong 18 giây rồi hạ cánh về vị trí cũ. Camera bám và zoom theo, vệt sáng kéo dài phía sau.
- **Ghép đôi**: hai nhân vật cùng xuất hiện với trái tim.
- **Vua**: cánh bạc, vương miện và hào quang lưu theo người chơi.
- **Đại bàng**: đôi cánh vàng vẫy, tia sáng và hào quang lưu theo người chơi.
- **Băng Lam, Phượng Hoàng Lửa, Ngân Hà, Lôi Long**: bốn bộ cánh mới, mỗi bộ có hình riêng, nhịp vỗ và hạt sáng riêng; cánh lưu theo người nhận.
- **Cưỡi Phượng Hoàng Tím**: chim thần 3D chở nhân vật bay vòng quanh sân khấu trong 20 giây, nghiêng cánh khi cua, lông đuôi uốn và vệt sáng tím xanh.
- **Nhảy một cái**: bật cao với vòng xung lực.
- **Ngộ Không**: hóa thân tạm thời; hết lượt trở về sticker đã chọn.

Phòng tối đa 120 nhân vật; hàng đợi tối đa 100 nhóm hiệu ứng. Quà chạy tuần tự.
Nút **40 người / 100 người / 120 người** thêm người mẫu vào sàn, giữ người và quà hiện có.
Vị trí không phụ thuộc số người: thêm người không thu nhỏ toàn bộ nhân vật.
Sàn, bục VIP, ban công, DJ, cầu gương, đèn và máy bay là vật thể trong scene 3D,
có chiều sâu, ánh sáng, vật liệu và phép thử chiều sâu bằng GPU. Camera dùng
PerspectiveCamera; vị trí, điểm nhìn và tiêu cự chuyển liên tục bằng bộ giảm
chấn, không dùng phép phóng to ảnh Canvas 2D.

Nhân vật giữ phong cách **sticker động dạng billboard** trong scene 3D, chưa
phải mô hình người có xương/rig 3D. Bố trí tối đa 40 cụm rải khắp sàn: người đứng riêng, cặp đôi và nhóm 3–5 người;
chừa khoảng đi giữa các cụm. Khi ít người, các cụm ở nhiều khu vực được lấp trước.
Các thành viên chỉ dịch chuyển nhẹ quanh chỗ đứng, không tự dồn về tâm sàn. Kích thước được cố định theo vị trí; người ở xa được bù kích thước để
giữ cỡ khoảng 90–120 px ở góc rộng 1080 × 1920, lớn hơn khi camera dạo gần từng cụm. Thêm người không làm
camera lùi xa hoặc cả đám đông co nhỏ. Bảng tên có giới hạn và tránh chồng nhau. Ba bục VIP nằm ở khu riêng phía
sau 120 chỗ đứng, giúp mặt bục không cắt ngang thân người chơi trên sàn.
Khi cận cảnh, người chắn ống kính mờ đi và đám đông phía sau giảm độ nổi.

Quà Vua cộng 3 điểm VIP, Đại bàng cộng 10 điểm; điểm VIP được dùng để phân hạng khi số quà bằng nhau. Ba người có nhiều
quà nhất đứng trên bục TOP trước màn hình sân khấu. Cánh vẫn còn khi hết cảnh zoom; cánh vàng không bị đổi về cánh bạc
khi nhận thêm quà Vua. Có thể gán các hiệu ứng VIP này cho quà khác trong admin.
Trong mục camera, **Tự động** luân phiên 6 góc khi không có quà: toàn sàn,
góc trái, dạo nhóm bạn, góc phải, trên cao và sân khấu TOP. Năm góc trên sàn
mỗi góc 18 giây, sân khấu TOP chỉ 6 giây trong vòng 96 giây. Không có lượt
zoom riêng vào bảng TOP. Chuyển dần sang góc tiếp trong 3,5 giây; có quà thì ưu tiên cảnh của người nhận.
**Toàn sàn** giữ góc rộng,
**Cận người chọn** giữ camera ở người đang chọn. OBS theo cùng chế độ.
**Dạo sàn 3D** lần lượt đến gần mỗi người theo chu kỳ 12 giây, giúp xem rõ cả
người đứng hàng sau. Có quà thì camera ưu tiên người nhận quà; hết lượt quay
về chế độ đang chọn. Không tự bảo đảm cùng mức FPS trên mọi cấu hình máy.

**TOP tặng quà 1–10** có huy hiệu chuyển sáng riêng phía trên bảng tên. Thứ hạng
tự cập nhật theo tổng số quà trong phiên, tính phần tăng của combo, không tính theo xu.
Bảng TOP trong admin cho phép bấm chọn người. Ba bục trước màn hình cũng theo TOP số quà; bảng TOP 5 cạnh màn hình và
huy hiệu cập nhật cùng một thứ hạng. Reset phòng sẽ xóa bảng xếp hạng.

Sáu kiểu cánh gồm vàng, bạc, Băng Lam, Phượng Hoàng Lửa, Ngân Hà và Lôi Long.
Nhận một quà cánh mới sẽ đổi sang kiểu đó; quà Vua không hạ cánh cao cấp về bạc.
Cánh cá nhân tạm ẩn khi cưỡi máy bay/chim thần, hiện lại sau khi hạ cánh để tránh
chồng cánh. Chế độ Toàn sàn vẫn giữ góc rộng trong lúc bay; Tự động/Cận nhân vật
bám theo người bay. Cấu hình v0.6 được bổ sung các quà mới khi nâng cấp, giữ nhạc
và các quy đổi đã lưu.

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
| `dist/admin.html`, `dist/admin.js` | Quản trị nhạc, bảng quà và phòng cạnh khung xem 3D |
| `dist/soundcloud-player.mjs` | Trình nhúng SoundCloud, điều khiển và báo trạng thái phát |
| `dist/music.html` | Nguồn âm thanh riêng cho OBS |
| `admin-store.mjs`, `music-hub.mjs` | Lưu cấu hình và giới hạn một cửa sổ phát nhạc |
| `dist/room-core.mjs` | Người chơi, combo, hàng đợi và tính quà |
| `dist/scene-math.mjs` | Bố trí nhóm, người đứng riêng, chuyển động tại chỗ và camera mượt |
| `dist/scene.mjs` | Scene Three.js, vật thể 3D, ánh sáng, huy hiệu TOP và camera |
| `dist/effect-math.mjs` | Quỹ đạo một vòng sân khấu, chuyển động cánh và TOP theo số quà |
| `dist/stage-display.mjs` | Màn hình sân khấu và bảng TOP tặng quà 3D cập nhật trực tiếp |
| `dist/wing-rig.mjs`, `dist/flight-rig.mjs` | Cánh có bản lề, máy bay đỏ, Phượng Hoàng 3D và vệt sáng |
| `dist/vendor/` | Three.js 0.187.0, giấy phép MIT và nguồn gói npm |
| `dist/stickers.mjs` | Tách khung sprite và giải mã GIF/WebP động |
| `sticker-store.mjs` | Lưu sticker tự nạp và danh mục cục bộ |
| `dist/assets/` | PNG nhân vật, Ngộ Không và các bộ cánh |
| `ASSET-NOTES.txt` | Nguồn tham khảo và prompt tạo PNG bằng ImageGen |
| `ASSET-PROMPTS-V4.json`, `ASSET-PROMPTS-V7.json` | Prompt chính xác và nguồn bộ cánh tạo bằng ImageGen |
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

`gift`: mã quà trong bảng quản trị (mặc định: `rose`, `tiktok`, `icecream`,
`doughnut`, `pair`, `crown`, `wings`, `jump`, `wukong`, `ice_wings`, `fire_wings`,
`galaxy_wings`, `storm_wings`, `phoenix_fly`). Đọc mã và cấu hình hiện tại
từ `GET /api/admin/state` → `giftRules`. Bridge cũng có thể gửi `"giftId": 5655`
thay cho `gift` nếu ID đó đã được gán trong admin. Quà tắt trả `gift_disabled`;
quà chưa khai báo trả `unknown_gift`. Khi có cả hai trường, `gift` được ưu tiên.
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
- **Báo không khởi tạo được sàn 3D:** kiểm tra WebGL 2/tăng tốc phần cứng trong
  trình duyệt hoặc OBS. Đóng các tab xem trước thừa để giảm tải GPU.

Bộ nhân vật PNG được tạo riêng bằng ImageGen theo phong cách sticker meme.
Các mẫu tham khảo chỉ dùng định hướng; bộ source này không chứa dữ liệu phiên
chơi, thông tin đăng nhập hoặc tài nguyên gốc của live TikTok tham chiếu.
