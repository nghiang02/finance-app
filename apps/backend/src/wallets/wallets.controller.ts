import {
  createWalletRequestSchema,
  type CreateWalletRequest,
  idSchema,
  updateWalletRequestSchema,
  type UpdateWalletRequest,
  type Wallet,
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
import { WalletsService } from "./wallets.service.js";

/** Every route is scoped to the signed-in user (AccessTokenGuard is global). */
@Controller("wallets")
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  /** GET /api/v1/wallets – all wallets (archived included), each with its current balance. */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Wallet[]> {
    return this.wallets.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createWalletRequestSchema }) body: CreateWalletRequest,
  ): Promise<Wallet> {
    return this.wallets.create(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
    @Body({ schema: updateWalletRequestSchema }) body: UpdateWalletRequest,
  ): Promise<Wallet> {
    return this.wallets.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", { schema: idSchema }) id: string,
  ): Promise<void> {
    return this.wallets.remove(user.id, id);
  }
}
