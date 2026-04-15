import { AppError } from "../utils/errors";
import { categoryRepository } from "../repositories/category.repository";

export const categoryService = {
  getCategories: async (userId: string, type?: string) => {
    return categoryRepository.findMany(userId, type);
  },

  createCategory: async (userId: string, data: { name: string; type: string; icon: string; color?: string }) => {
    // Validate type
    if (data.type !== 'INCOME' && data.type !== 'EXPENSE') {
      throw AppError.BadRequest("Type must be INCOME or EXPENSE");
    }

    return categoryRepository.create({
      userId,
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
    });
  },

  updateCategory: async (id: string, userId: string, data: { name?: string; type?: string; icon?: string; color?: string }) => {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw AppError.NotFound("Category not found");
    }

    // Kiểm tra quyền 1: Không được sửa default category của hệ thống
    if (category.userId === null) {
      throw AppError.Forbidden("Cannot edit default categories");
    }

    // Kiểm tra quyền 2: Không được sửa category của người khác
    if (category.userId !== userId) {
      throw AppError.Forbidden("You do not have permission to edit this category");
    }

    // Validate type nếu client có gửi lên để cập nhật
    if (data.type && data.type !== 'INCOME' && data.type !== 'EXPENSE') {
      throw AppError.BadRequest("Type must be INCOME or EXPENSE");
    }

    return categoryRepository.update(id, data);
  },

  deleteCategory: async (id: string, userId: string) => {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw AppError.NotFound("Category not found");
    }

    // Kiểm tra quyền sở hữu (giống hệt update)
    if (category.userId === null) {
      throw AppError.Forbidden("Cannot delete default categories");
    }
    if (category.userId !== userId) {
      throw AppError.Forbidden("You do not have permission to delete this category");
    }

    // Kiểm tra xem category có đang được transaction nào dùng không
    const usageCount = await categoryRepository.checkTransactionUsage(id);
    if (usageCount > 0) {
      throw AppError.Conflict("Cannot delete category currently in use by transactions");
    }

    return categoryRepository.softDelete(id);
  },
};