# THIÊN KHUÊ S - Hệ Thống Vận Hành Hợp Nhất Lyno & Thiên Khuê

## 1. Giới thiệu tổng quan
**Thiên Khuê S** Là nền tảng vận hành tập trung được xây dựng nhằm kết nối và chuẩn hóa toàn diện hoạt động giữa khách hàng, nhân sự bán hàng, người học, nhà sáng tạo nội dung (KOL/KOC) và đối tác chiến lược.

Hệ thống là điểm chạm duy nhất đóng vai trò vừa là trang đón tiếp công khai, vừa là cổng đào tạo nội bộ, không gian làm việc theo vai trò và bàn điều hành quản trị tập trung. Mọi hoạt động phát sinh trên hệ thống đều được liên kết chặt chẽ xung quanh 4 thực thể gốc: **Con người – Sản phẩm – Công việc – Giao dịch**.

---

## 2. Triết lý vận hành cốt lõi

### 2.1. Một hồ sơ gốc – Đa vai trò (Single Profile, Multi-Role)
* Một người dùng chỉ sở hữu **một hồ sơ gốc duy nhất** nhưng có thể chuyển đổi hoặc đồng thời đảm nhận nhiều vai trò theo thời gian (ví dụ: Thực tập sinh hoàn thành đào tạo trở thành KOC, đồng thời là Khách hàng VIP).
* Hệ thống lưu trữ xuyên suốt lịch sử chuyển vai trò mà không tạo hồ sơ trùng lặp.

### 2.2. Học trước khi bán (Product-Based Permission)
* Áp dụng bắt buộc cho Sale, CSKH, Cộng tác viên, Thực tập sinh, KOL và KOC.
* Đăng ký tài khoản chưa phải là tài khoản làm việc. Người dùng chỉ được kích hoạt tài khoản làm việc sau khi:
  * Hoàn thành phần kiến thức chung và phần riêng theo vai trò.
  * Đạt tối thiểu **90% điểm bài kiểm tra bắt buộc**.
  * Hoàn thành bài thực hành và được duyệt.
* **Cấp quyền theo từng mã sản phẩm (SKU):** Nhân sự học đạt mã sản phẩm nào thì chỉ được cấp quyền tư vấn, lấy mã giới thiệu hoặc nhận chiến dịch cho đúng mã đó (ví dụ: đạt mã AB0483 không đồng nghĩa được bán mã AB0482). Hệ thống tự động chặn thao tác với sản phẩm chưa được cấp quyền.
* Khi sản phẩm thay đổi thông tin quan trọng, hệ thống sẽ gửi thông báo và yêu cầu xác nhận hoặc học lại trước khi tiếp tục bán.

### 2.3. Minh bạch ghi nhận & Chống xung đột đơn hàng
* Mỗi đơn hàng hợp lệ chỉ ghi nhận duy nhất một người bán để tính quyền lợi.
* Trường hợp có sự khác biệt giữa mã giới thiệu (KOC/CTV) và người chốt đơn (Sale), đơn hàng sẽ được đưa vào trạng thái **chờ xác minh** để người phụ trách thẩm định, tuyệt đối không tự động chi trả hai lần trên cùng một đơn.

---

## 3. Các phân vùng chức năng trên hệ thống

### 🌐 1. Trang công khai (Public Storefront & Landing Hub)
* Dành cho khách vãng lai và đối tác chưa đăng nhập.
* Trưng bày các hoạt động của Lyno, Thiên Khuê, danh mục sản phẩm, câu chuyện thương hiệu và các cổng tiếp nhận đăng ký trực tuyến.

### 🎓 2. Cổng đào tạo (Training Portal)
* Dành cho nhân sự và đối tác đã được tiếp nhận học.
* Cung cấp nội dung đào tạo đa tầng:
  * **Nền tảng:** Văn hóa thương hiệu, chuẩn mực giao tiếp, quy trình xử lý phản hồi.
  * **Nghiệp vụ:** Kỹ năng tư vấn cho Sale/CSKH, quy chuẩn sáng tạo video cho KOL/KOC, bài tập cho Thực tập sinh.
  * **Sản phẩm chi tiết:** Chất liệu, thiết kế, phom dáng, size, màu sắc, giá bán và các lưu ý tư vấn chuyên sâu theo từng mã SKU.
* Lưu trữ bằng chứng đạt: điểm số ($\ge 90\%$), bài thực hành, nhận xét, người chấm, ngày duyệt, phiên bản tài liệu và thời điểm cấp quyền.

### 💼 3. Không gian làm việc cá nhân (Role-Based Workspace)
* **Sale & CSKH online:** Là nhân sự trực thuộc công ty; được phân bổ khách theo ca trực, năng lực và tải việc; chỉ xem dữ liệu khách được giao; hỗ trợ chuyên môn cho KOL/KOC.
* **Cộng tác viên (CTV) online:** Nhận tài liệu và mã/đường dẫn giới thiệu cho các sản phẩm đã được cấp quyền; theo dõi nguồn đơn và chiết khấu.
* **Thực tập sinh:** Học lộ trình trực tiếp hoặc online; làm bài tập có mentor hướng dẫn; kết quả đánh giá là căn cứ đề xuất chuyển vai trò (Sale, CTV, KOC).
* **KOL & KOC:** Nhận chiến dịch, nộp kịch bản/video, gắn mã sản phẩm; theo dõi lượt xem, tương tác, đơn hàng và nghiệm thu đối soát.
* **Bảng thu nhập & Ví hoa hồng:** Phân định rõ đơn đủ điều kiện, đơn chờ đối soát, đơn hoàn/hủy (bị trừ tích lũy), các khoản điều chỉnh và lịch sử duyệt.

### 👑 4. Khu vực Khách hàng & Đối tác chiến lược
* **Hạng thành viên (Tích lũy từ đơn thực mua, không tính đơn hoàn/trả):**
  * *Khách Thân thiết (từ 50 triệu đồng):* Giảm giá 5%.
  * *Khách VIP (từ 100 triệu đồng):* Giảm giá 10% và tiếp cận các voucher/quà tặng đặc quyền từ đối tác.
  * Khi đơn hàng bị hoàn/trả, hệ thống tự động tính lại hạng thành viên và điều kiện quyền lợi.
* **Chương trình "Khách hàng hạnh phúc":**
  * Mời khách hàng có từ **10 lần mua hợp lệ** trở lên tham gia mua sớm các mẫu thử nghiệm với ưu đãi riêng để gửi góp ý về size, chất liệu, kiểu dáng.
  * Việc tham gia là hoàn toàn tự nguyện; phản hồi riêng tư không đồng nghĩa với việc đồng ý dùng hình ảnh/video để truyền thông quảng cáo.
* **Đặc quyền & Quà tặng đối tác:**
  * Quản lý voucher, quà tặng hiện vật được cung cấp bởi Lyno, Thiên Khuê hoặc đối tác liên kết.
  * Mọi sản phẩm quà tặng đều phải qua khâu thẩm định chất lượng và được Thiên Khuê phê duyệt trước khi hiển thị.
* **CEO & Hợp tác chiến lược:**
  * Quản lý khách hàng doanh nghiệp, ngân hàng, tổ chức đặt quà số lượng lớn hoặc hợp tác chiến dịch đồng thương hiệu.
  * Tách bạch rõ doanh thu bán quà, chi phí tài trợ và kết quả chiến dịch; bảo mật danh sách khách hàng cá nhân trước đối tác.

---

## 4. Bảng điều hành Quản trị (Admin & Management)
* Quản lý tập trung 6 nhóm hồ sơ liên kết: Người dùng, Khách hàng, Sản phẩm, Hoạt động, Giao dịch và Đối tác.
* Bàn phê duyệt dành cho CEO và Thiên Khuê: duyệt chất lượng quà tặng đối tác, giải quyết các ca trùng nguồn đơn hàng, kiểm soát thay đổi chính sách.
* Hệ thống phân quyền chặt chẽ: tách biệt rõ ràng giữa người đề xuất, người kiểm tra và người phê duyệt ở các quyết định liên quan đến dòng tiền, dữ liệu khách hàng hoặc cấp quyền bán.

---

## 5. Định hướng AI First (Tích hợp AI Agent)
Triển khai sau khi các quy trình và cấu trúc dữ liệu đã vận hành ổn định:
* **Nhiệm vụ của AI Agent:** Hướng dẫn học viên, chấm sơ bộ bài kiểm tra, tiếp nhận và phân loại khách hàng, nhắc việc CSKH, gợi ý mẫu theo số đo/sở thích, hỗ trợ KOC làm nội dung và lập báo cáo phân tích.
* **Quy tắc an toàn & Quản trị AI:**
  * Giai đoạn đầu, Thiên Khuê trực tiếp kiểm tra trước khi AI gửi nội dung ra ngoài hoặc ra quyết định nghiệp vụ.
  * Về sau, AI chỉ được hoạt động trong phạm vi và ngưỡng giá trị được Thiên Khuê ủy quyền cụ thể.
  * AI không được tự mở rộng quyền bán, không tự sửa chính sách chiết khấu, không tự cam kết ngân sách; các trường hợp ngoại lệ bắt buộc phải chuyển về cho con người xử lý.
  * Mọi hành động của AI đều phải lưu nhật ký (logs) và báo cáo phải truy xuất được dữ liệu gốc.

---

## 6. Lộ trình triển khai (5 Giai đoạn)
1. **Giai đoạn 1 - Thiết kế:** Xây dựng sơ đồ màn hình, cấu trúc dữ liệu, vai trò, ma trận phân quyền và bản thao tác thử.
2. **Giai đoạn 2 - Nền tảng:** Cổng đăng nhập, cổng học tập, bài thi trắc nghiệm (ngưỡng 90%), cấp quyền theo vai trò và sản phẩm, quản lý Sale/CSKH và phân bổ khách.
3. **Giai đoạn 3 - Mạng lưới:** Quản lý CTV, Thực tập sinh, KOL/KOC, nộp video, quản lý chiến dịch và đối soát đơn.
4. **Giai đoạn 4 - Khách hàng & Đối tác:** Tích lũy hạng thẻ (Thân thiết/VIP), chương trình Khách hàng hạnh phúc, cổng quà tặng và đối tác chiến lược.
5. **Giai đoạn 5 - AI Agent:** Kết nối các AI Agent theo quy trình đã ổn định, thiết lập ngưỡng ủy quyền, nhật ký giám sát và cơ chế chuyển ngoại lệ.

##**7. Kiến trúc Công nghệ đề xuất (Tech Stack)**
<p align="center">
  <!-- Frontend & Core -->
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <br/>
  <!-- Backend & Architecture -->
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm" />
  <br/>
  <!-- Database & Queue -->
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-brown?style=for-the-badge&logo=bull&logoColor=white" alt="BullMQ" />
  <br/>
  <!-- Storage, DevOps & AI -->
  <img src="https://img.shields.io/badge/Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare R2" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" />
</p>
Để đáp ứng bài toán một website chung tích hợp cả cổng bán hàng bên ngoài lẫn hệ thống phân quyền, đối soát hoa hồng và LMS bên trong, hệ thống được kiến trúc theo chuẩn Module hóa:

| Tầng hệ thống | Công nghệ đề xuất | Lý do & Vai trò kỹ thuật |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (React, TypeScript, Tailwind CSS)** | • Tối ưu SEO và tốc độ tải trang cho Storefront bán hàng công khai.<br>• Dùng Route Groups (`(storefront)`, `(training)`, `(workspace)`, `(admin)`) để quản lý đa phân vùng trên cùng một domain. |
| **Backend API** | **NestJS (TypeScript)** | • Kiến trúc Modular quản lý rõ ràng từng phân hệ (`Auth`, `LMS`, `LeadRouting`, `Affiliate`, `Loyalty`).<br>• Custom Guards xử lý chặn quyền bán chi tiết tới từng SKU sản phẩm (ngưỡng 90%). |
| **Cơ sở dữ liệu** | **PostgreSQL (với Prisma ORM)** | • Đảm bảo chuẩn giao dịch ACID cho đối soát hoa hồng và tự động hạ hạng khi hoàn/trả.<br>• Quản trị quan hệ dữ liệu đa tầng (`Single Profile - Multi-Role`) an toàn.<br>• Lưu trữ linh hoạt đề thi, metadata kịch bản qua kiểu dữ liệu `JSONB`. |
| **Hàng đợi & Caching** | **Redis + BullMQ** | • Xử lý phân bổ lead theo ca trực và tải việc.<br>• Chạy ngầm tác vụ tính lại tích lũy đơn hàng, đối soát hoa hồng và cache trạng thái quyền SKU. |
| **Lưu trữ Tệp** | **Cloudflare R2 / AWS S3** | • Lưu trữ tài liệu đào tạo, video bài thực hành của KOC/học viên, ảnh quà tặng đối tác. |
| **Tích hợp AI** | **Google Gemini API** | • Tích hợp các Service chấm sơ bộ bài kiểm tra, gợi ý tư vấn và phân tích phản hồi. |
