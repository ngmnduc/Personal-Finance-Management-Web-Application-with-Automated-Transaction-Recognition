import { PrismaClient, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()

const defaultCategories = [
  // ── EXPENSE ──────────────────────────────
  { name: 'Ăn uống',         type: TransactionType.EXPENSE, icon: 'utensils' },
  { name: 'Di chuyển',       type: TransactionType.EXPENSE, icon: 'car' },
  { name: 'Mua sắm',         type: TransactionType.EXPENSE, icon: 'shopping-bag' },
  { name: 'Giải trí',        type: TransactionType.EXPENSE, icon: 'gamepad-2' },
  { name: 'Sức khỏe',        type: TransactionType.EXPENSE, icon: 'heart-pulse' },
  { name: 'Giáo dục',        type: TransactionType.EXPENSE, icon: 'book-open' },
  { name: 'Nhà ở & Tiện ích',type: TransactionType.EXPENSE, icon: 'home' },
  { name: 'Quần áo',         type: TransactionType.EXPENSE, icon: 'shirt' },
  { name: 'Điện thoại & Net',type: TransactionType.EXPENSE, icon: 'wifi' },
  { name: 'Du lịch',         type: TransactionType.EXPENSE, icon: 'plane' },
  { name: 'Quà tặng',        type: TransactionType.EXPENSE, icon: 'gift' },
  { name: 'Chi phí khác',    type: TransactionType.EXPENSE, icon: 'circle-ellipsis' },

  // ── INCOME ───────────────────────────────
  { name: 'Lương',           type: TransactionType.INCOME,  icon: 'banknote' },
  { name: 'Thưởng',          type: TransactionType.INCOME,  icon: 'trophy' },
  { name: 'Freelance',       type: TransactionType.INCOME,  icon: 'laptop' },
  { name: 'Đầu tư',          type: TransactionType.INCOME,  icon: 'trending-up' },
  { name: 'Kinh doanh',      type: TransactionType.INCOME,  icon: 'store' },
  { name: 'Chuyển khoản đến',type: TransactionType.INCOME,  icon: 'arrow-down-circle' },
  { name: 'Thu nhập khác',   type: TransactionType.INCOME,  icon: 'circle-ellipsis' },
]

async function main() {
  console.log('🌱 Seeding default categories...')

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: {
        // upsert theo name + type để tránh tạo trùng khi chạy seed nhiều lần
        id: `system-${cat.type.toLowerCase()}-${cat.name}`,
      },
      update: {},
      create: {
        id:        `system-${cat.type.toLowerCase()}-${cat.name}`,
        userId:    null,   // null = system default, không thuộc user nào
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