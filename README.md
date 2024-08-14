# ADT_TEST_BE
Cách cài và chạy dự án
1. Cài Đặt Git
   Trước tiên, hãy đảm bảo rằng Git đã được cài đặt trên máy tính của bạn.
   Cài Đặt Git:
   Truy cập trang tải xuống Git: [Git Downloads](https://git-scm.com/downloads).
   Tải về và cài đặt phiên bản phù hợp với hệ điều hành của bạn.
    Cài đặt Ngrok tại trang chủ ngrok
    
2. Clone Dự Án
   -Mở Terminal (hoặc Command Prompt)
   -Chạy Lệnh Clone: git clone https://github.com/andinhdai/Cap2_BE.git
   -Sau khi quá trình clone hoàn tất, di chuyển vào thư mục của dự án: cd ADT_TEST_FE
  
3. Cài Đặt Các Gói Phụ Thuộc
   Vì dự án sử dụng Node.js(Angular), bạn cần cài đặt các gói phụ thuộc.
   npm install

4. Chạy Dự Án
    -Mở Terminal chạy lệnh : ngrok http 3000 bạn sẽ nhận được 1 redirect_uri
    -Thêm redirect_uri/install vào đường dẫn ban đầu của ứng dụng(trước đó tìm hiểu các cài đặt ứng dụng trên bitrix24)
    -Truy cập https://oauth.bitrix.info/oauth/authorize/?client_id={CLIENT_ID}&response_type=code&redirect_uri={REDIRECT_URI}/install để lấy auth_code
    - Sau khi lấy được auth_code truy cập link: {REDIRECT_URI}/install?code={auth_code} yêu cầu cài đặt ứng dụng và lưu token để gọi api bất kỳ.
    
   Để chạy BE, sử dụng lệnh.
   npm start
  

*Lưu ý: Phải chạy cùng lúc client(FE) và server(BE)

