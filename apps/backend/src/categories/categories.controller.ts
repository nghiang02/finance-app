import {
  type Category,
  createCategoryRequestSchema,
  type CreateCategoryRequest,
  deleteCategoryQuerySchema,
  type DeleteCategoryQuery,
  idSchema,
  updateCategoryRequestSchema,
  type UpdateCategoryRequest,
} from "@finance/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { type AuthUser, CurrentUser } from "../auth/current-user.decorator.js";
import { CategoriesService } from "./categories.service.js";

/** Every route is scoped to the signed-in user (AccessTokenGuard is global). */
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** GET /api/v1/categories – flat list of active categories (parents and children). */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Category[]> {
    return this.categories.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createCategoryRequestSchema }) body: CreateCategoryRequest,
  ): Promise<Category> {
    return this.categories.create(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
    @Body({ schema: updateCategoryRequestSchema }) body: UpdateCategoryRequest,
  ): Promise<Category> {
    return this.categories.update(user.id, id, body);
  }

  /** DELETE /api/v1/categories/:id?replacementId=… (replacement needed only if it is in use). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
    @Query({ schema: deleteCategoryQuerySchema }) query: DeleteCategoryQuery,
  ): Promise<void> {
    return this.categories.remove(user.id, id, query.replacementId);
  }
}
