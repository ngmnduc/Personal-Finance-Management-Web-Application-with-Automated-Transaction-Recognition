# Finman Frontend Conventions & Guidelines

Bạn là AI Coding Agent làm việc trên dự án Finman. Bắt buộc tuân thủ các quy chuẩn dưới đây trước khi viết hoặc sửa bất kỳ dòng code Frontend nào.

## 1. Kiến trúc thư mục (Folder Structure)
- Dự án sử dụng mô hình Feature-Sliced kết hợp Pages:
  - `src/features/<tên_feature>/api/`: Chứa các custom hooks React Query (useQuery, useMutation).
  - `src/features/<tên_feature>/components/`: Chứa UI components đặc thù của feature đó.
  - `src/pages/<TênTrang>/`: Chứa entry point của các màn hình (ví dụ: `src/pages/Scan/index.tsx`).
  - `src/components/shared/`: Component dùng chung toàn app (ConfidenceBadge, PageSkeleton, AmountDisplay...).
  - `src/components/ui/`: Components cơ bản từ shadcn/ui (Button, Input, Card...).
  - `src/store/`: Zustand stores.
  - `src/lib/`: Utils, hằng số, cấu hình (axios, constants...).

## 2. Thư viện cốt lõi (Core Stack)
- **Data Fetching:** Sử dụng `react-query` và `axios`. KHÔNG gọi trực tiếp `axios` trong UI Component. Luôn gọi thông qua custom hook ở thư mục `features/.../api/`. Instance axios chuẩn: `import axiosInstance from '@/lib/axios'`.
- **State Management:** - Global State: `zustand` (`useAuthStore`, `useUiStore`).
  - Server State: `react-query`.
- **Routing:** `react-router-dom` (Sử dụng hook `useNavigate`, `useParams`).
- **Forms & Validation:** BẮT BUỘC dùng kết hợp `react-hook-form` và `@hookform/resolvers/zod` + `zod` schema.
- **Toasts:** Sử dụng `sonner` (`toast.success`, `toast.error`).

## 3. UI & Design Tokens (Tailwind CSS)
Bám sát theme của Dashboard. Hạn chế hardcode mã màu hex mới.
- **Background App:** `bg-[#f0f4f8]`
- **Container chuẩn:** `max-w-[1400px] mx-auto p-8` (hoặc tương tự tùy layout).
- **Cards chuẩn:** `bg-white rounded-[2rem] shadow-sm border border-slate-100`
- **Màu sắc chính:**
  - Primary (Navy): `bg-[#0f1f3d]`, `text-[#0f1f3d]`.
  - Accent (Emerald): `#10b981` (dùng cho Income, Thành công, Tích cực).
  - Danger (Red): Dùng cho Expense, Xóa, Cảnh báo.
- **Buttons:** Dùng variant của shadcn. Primary button tự build: `bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57]`.

## 4. Coding Standards bắt buộc
1. **Tuyệt đối tái sử dụng Component có sẵn:** Trước khi tạo component mới như Badge, Skeleton, Card, hãy check thư mục `src/components/shared/` và `src/components/ui/` xem đã có chưa.
2. **Icons:** Sử dụng thư viện `lucide-react`.
3. **URL Memory Leak:** Nếu tạo `URL.createObjectURL(file)`, bắt buộc phải có `useEffect` để `URL.revokeObjectURL()` khi component unmount.
4. **Imports:** Khuyến khích dùng alias