import {prisma} from "../config/prisma";

export const categoryRepository = {
  findMany: async (userId: string, type?: string) => {
    // Xây dựng điều kiện query cơ bản
    const whereCondition: any = {
      deletedAt: null,
      OR: [
        { userId: null },
        { userId: userId }
      ]
    };

    // Nếu có truyền type, thêm vào điều kiện
    if (type) {
      whereCondition.type = type as any;
    }

    return prisma.category.findMany({
      where: whereCondition,
      orderBy: [
        { userId: { sort: 'asc', nulls: 'first' } }, // Default categories lên đầu
        { name: 'asc' }
      ]
    });
  },

  findById: async (id: string) => {
    return prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
  },

  checkTransactionUsage: async (categoryId: string) => {
    return prisma.transaction.count({
      where: { categoryId },
    });
  },

  create: async (data: { userId: string; name: string; type: string; icon: string; color?: string }) => {
    return prisma.category.create({
      data: {
        userId: data.userId,
        name: data.name,
        type: data.type as any, // Ép kiểu cho enum Prisma
        icon: data.icon,
        color: data.color,
      },
    });
  },

  update: async (id: string, data: { name?: string; type?: string; icon?: string; color?: string }) => {
    return prisma.category.update({
      where: { id },
      data: {
        ...data,
        type: data.type ? (data.type as any) : undefined,
      },
    });
  },

  softDelete: async (id: string) => {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};