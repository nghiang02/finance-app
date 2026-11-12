import {
  createTransactionRequestSchema,
  type CreateTransactionRequest,
  idSchema,
  type Transaction,
  updateTransactionRequestSchema,
  type UpdateTransactionRequest,
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
} from "@nestjs/common";

import { type AuthUser, CurrentUser } from "../auth/current-user.decorator.js";
import { TransactionsService } from "./transactions.service.js";

/** Every route is scoped to the signed-in user (AccessTokenGuard is global). */
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get(":id")
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
  ): Promise<Transaction> {
    return this.transactions.get(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createTransactionRequestSchema }) body: CreateTransactionRequest,
  ): Promise<Transaction> {
    return this.transactions.create(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
    @Body({ schema: updateTransactionRequestSchema }) body: UpdateTransactionRequest,
  ): Promise<Transaction> {
    return this.transactions.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
  ): Promise<void> {
    return this.transactions.remove(user.id, id);
  }
}
