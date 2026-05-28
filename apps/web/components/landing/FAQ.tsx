"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal } from "./Reveal";

const ITEMS = [
  {
    q: "Trợ lý AI có thay thế bác sĩ không?",
    a: "Không. AI chỉ làm thay phần ghi chép, nhắc lịch và trả lời câu hỏi đời thường (kiểu “sốt 38.5 thì uống gì”, “tái khám khi nào”). Mọi việc liên quan đến khám, kê đơn, chẩn đoán đều do bác sĩ thật của phòng khám quyết định.",
  },
  {
    q: "Tôi không rành công nghệ, dùng app có khó không?",
    a: "Bạn chỉ cần biết nhắn tin. Mở app, gõ câu hỏi như đang nhắn cho con cháu — “tôi đau bụng từ sáng”, “con tôi cần tiêm vắc-xin nào”. Trợ lý sẽ hỏi lại nếu cần và hướng dẫn từng bước. Người lớn tuổi dùng rất tốt.",
  },
  {
    q: "Đặt lịch khám có mất phí không?",
    a: "Đặt lịch miễn phí. Bạn chỉ trả phí khám và thuốc/xét nghiệm theo bảng giá phòng khám khi đến khám. Trợ lý AI cũng miễn phí — dùng bao nhiêu cũng được.",
  },
  {
    q: "Có nhận bảo hiểm y tế không?",
    a: "Có. Hospital AI là cơ sở khám chữa bệnh đăng ký bảo hiểm y tế (BHYT) và liên kết với hầu hết các hãng bảo hiểm tư nhân lớn tại Việt Nam. Mang theo thẻ khi đến khám lần đầu.",
  },
  {
    q: "Dữ liệu sức khoẻ của tôi có an toàn không?",
    a: "Hồ sơ của bạn chỉ bạn và bác sĩ phụ trách thấy được. Phòng khám tuân thủ quy định bảo mật dữ liệu y tế của Bộ Y tế. Bạn có thể xoá tài khoản và yêu cầu xoá hồ sơ bất cứ lúc nào.",
  },
  {
    q: "Có khám tại nhà không?",
    a: "Có dịch vụ khám tại nhà cho người cao tuổi, người khó di chuyển — gọi hotline 1900 8088 để đặt. Trợ lý AI vẫn dùng được bình thường ngay cả khi bạn đặt khám tại nhà.",
  },
  {
    q: "Trợ lý AI có nhớ tôi không hay mỗi lần phải kể lại từ đầu?",
    a: "AI biết hồ sơ của bạn (tên, tuổi, bệnh nền, đơn thuốc gần nhất) và nhớ các cuộc trò chuyện trước. Bạn không cần kể lại từ đầu mỗi lần — nhưng cũng có thể xoá lịch sử chat nếu muốn.",
  },
  {
    q: "Trẻ em hoặc người lớn tuổi trong nhà tôi có dùng được không?",
    a: "Một tài khoản dùng cho một người. Bạn có thể tạo tài khoản riêng cho con, cho ông bà và quản lý giúp. Bác sĩ gia đình phụ trách thường là cùng một người cho cả nhà — tiện theo dõi sức khoẻ chung.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-surface/40">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-24">
        <Reveal>
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
              Câu hỏi thường gặp
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Câu trả lời rõ ràng, không vòng vo.
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 space-y-3">
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={it.q} delay={0.03 * (i + 1)}>
                <div
                  className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                    isOpen ? "border-brand-200" : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-medium text-slate-900 sm:text-base">
                      {it.q}
                    </span>
                    <span
                      className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-all ${
                        isOpen
                          ? "rotate-45 bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="px-5 pb-5 text-sm leading-relaxed text-slate-600">
                          {it.a}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
