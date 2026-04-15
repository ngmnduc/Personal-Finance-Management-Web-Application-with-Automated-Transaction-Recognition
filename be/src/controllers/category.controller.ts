import { Request, Response, NextFunction } from "express";
import { categoryService } from "../services/category.service";
import { sendSuccess } from "../utils/response";

export const categoryController = {
  getCategories: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const type = req.query.type as string | undefined;
      
      const categories = await categoryService.getCategories(userId, type);
      sendSuccess(res, categories, "Get categories successfully", 200);
    } catch (error) {
      next(error);
    }
  },

  createCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { name, type, icon, color } = req.body;

      const category = await categoryService.createCategory(userId, { name, type, icon, color });
      sendSuccess(res, category, "Category created successfully", 201);
    } catch (error) {
      next(error);
    }
  },

  updateCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as {id:string};
      const { name, type, icon, color } = req.body;

      const category = await categoryService.updateCategory(id, userId, { name, type, icon, color });
      sendSuccess(res, category, "Category updated successfully", 200);
    } catch (error) {
      next(error);
    }
  },

  deleteCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params as {id:string};

      await categoryService.deleteCategory(id, userId);
      sendSuccess(res, null, "Category deleted successfully", 200);
    } catch (error) {
      next(error);
    }
  },
};