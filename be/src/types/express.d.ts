// Import Express namespace
import { Express } from 'express';

// Declaration Merging: Mở rộng interface Request có sẵn của Express
declare global {
  namespace Express {
    interface Request {
      // Khai báo đúng kiểu dữ liệu mà auth.middleware.ts của bạn đang gắn vào
      user?: {
        userId: string;
        email?: string;
        tokenVersion?: number;

      };
    }
  }
}
export {};