import { PrismaClient, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()

// Đã cấp sẵn UUID v4 chuẩn quốc tế cho từng danh mục
const defaultCategories = [
  // ── EXPENSE ──────────────────────────────
  { id: '11111111-a1b2-4c3d-8e5f-000000000001', name: 'Food & Dining',       type: TransactionType.EXPENSE, icon: 'utensils' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000002', name: 'Transportation',      type: TransactionType.EXPENSE, icon: 'car' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000003', name: 'Shopping',            type: TransactionType.EXPENSE, icon: 'shopping-bag' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000004', name: 'Entertainment',       type: TransactionType.EXPENSE, icon: 'gamepad-2' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000005', name: 'Health & Fitness',    type: TransactionType.EXPENSE, icon: 'heart-pulse' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000006', name: 'Education',           type: TransactionType.EXPENSE, icon: 'book-open' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000007', name: 'Housing & Utilities', type: TransactionType.EXPENSE, icon: 'home' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000008', name: 'Clothing',            type: TransactionType.EXPENSE, icon: 'shirt' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000009', name: 'Phone & Internet',    type: TransactionType.EXPENSE, icon: 'wifi' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000010', name: 'Travel',              type: TransactionType.EXPENSE, icon: 'plane' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000011', name: 'Gifts',               type: TransactionType.EXPENSE, icon: 'gift' },
  { id: '11111111-a1b2-4c3d-8e5f-000000000012', name: 'Other Expenses',      type: TransactionType.EXPENSE, icon: 'circle-ellipsis' },

  // ── INCOME ───────────────────────────────
  { id: '22222222-a1b2-4c3d-8e5f-000000000101', name: 'Salary',              type: TransactionType.INCOME,  icon: 'banknote' },
  { id: '22222222-a1b2-4c3d-8e5f-000000000102', name: 'Bonus',               type: TransactionType.INCOME,  icon: 'trophy' },
  { id: '22222222-a1b2-4c3d-8e5f-000000000103', name: 'Freelance',           type: TransactionType.INCOME,  icon: 'laptop' },
  { id: '22222222-a1b2-4c3d-8e5f-000000000104', name: 'Investment',          type: TransactionType.INCOME,  icon: 'trending-up' },
  { id: '22222222-a1b2-4c3d-8e5f-000000000105', name: 'Business',            type: TransactionType.INCOME,  icon: 'store' },
  { id: '22222222-a1b2-4c3d-8e5f-000000000106', name: 'Incoming Transfer',   type: TransactionType.INCOME,  icon: 'arrow-down-circle' },
  { id: '22222222-a1b2-4c3d-8e5f-000000000107', name: 'Other Income',        type: TransactionType.INCOME,  icon: 'circle-ellipsis' },
]

async function main() {
  console.log('🌱 Seeding default categories (UUID format)...')

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        icon: cat.icon,
      },
      create: {
        id:        cat.id,
        userId:    null,   
        name:      cat.name,
        type:      cat.type,
        icon:      cat.icon,
        isDefault: true,
      },
    })
  }

  console.log(`✅ Seeded ${defaultCategories.length} default categories`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })