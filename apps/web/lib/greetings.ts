// Lời chào "fake gen token" cho bệnh nhân khi vừa vào app (KHÔNG gọi AI thật —
// frontend tự render từng chữ một). Soạn sẵn nhiều biến thể, random chọn để
// đỡ trùng. Mỗi biến thể: giới thiệu trợ lý + nhiệm vụ + hỏi muốn tư vấn gì.

function build(name: string): string[] {
  const n = name.trim() ? ` ${name.trim()}` : "";
  return [
    `Xin chào${n}! Mình là trợ lý sức khỏe ảo của Phòng khám Gia đình. Mình có thể giúp bạn giải đáp thắc mắc về sức khỏe, hướng dẫn đặt lịch khám và tra cứu hồ sơ, kết quả xét nghiệm của bạn. Hôm nay bạn muốn được tư vấn về điều gì ạ?`,
    `Chào bạn${n} 👋 Mình là trợ lý ảo đồng hành cùng bạn tại Phòng khám Gia đình. Bạn có thể hỏi mình về các vấn đề sức khỏe, nhờ mình hỗ trợ đặt lịch khám hoặc xem lại hồ sơ của mình. Bạn đang cần mình giúp điều gì nào?`,
    `Xin chào${n}! Mình là trợ lý ảo của Phòng khám Gia đình, luôn sẵn sàng lắng nghe và tư vấn cho bạn về sức khỏe. Mình cũng có thể giúp bạn đặt lịch khám và theo dõi hồ sơ cá nhân. Hôm nay mình có thể giúp gì cho bạn?`,
    `Rất vui được gặp bạn${n}! Mình là trợ lý sức khỏe ảo của Phòng khám Gia đình. Dù là một thắc mắc nhỏ về sức khỏe, muốn đặt lịch khám hay xem kết quả xét nghiệm, bạn cứ nói với mình nhé. Bạn muốn bắt đầu từ đâu?`,
  ];
}

export function pickPatientGreeting(name = ""): string {
  const variants = build(name);
  return variants[Math.floor(Math.random() * variants.length)];
}
