/* -------------------------------------- Types -------------------------------------- */

// Type event ของ LINE webhook (เก็บ field อื่นไว้ครบเพื่อส่งต่อแบบไม่ตัดข้อมูล)
export type LineWebhookEvent = {
  type?: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: {
    type?: string;
    userId?: string;
  };
  postback?: {
    data?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
  [key: string]: unknown;
};

// Type body ของ LINE webhook
export type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};
