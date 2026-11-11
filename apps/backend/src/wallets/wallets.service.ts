import type {
  CreateWalletRequest,
  UpdateWalletRequest,
  Wallet as WalletDto,
} from "@finance/shared";
import { HttpStatus, Injectable } from "@nestjs/common";

import { ApiException } from "../common/api-exception.js";
import { moneyToBigInt, moneyToNumber } from "../common/money.js";
import type { Wallet } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { computeBalance, NO_MOVEMENTS, type WalletMovements } from "./balance.js";

function toWalletDto(wallet: Wallet, movements: WalletMovements): WalletDto {
  return {
    id: wallet.id,
    name: wallet.name,
    type: wallet.type,
    currency: wallet.currency,
    initialBalance: moneyToNumber(wallet.initialBalance),
    balance: moneyToNumber(computeBalance(wallet.initialBalance, movements)),
    archived: wallet.archived,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function walletNotFound(): ApiException {
  // Same answer for "does not exist" and "belongs to someone else": ids are not a way
  // to probe other people's data.
  return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Wallet not found");
}

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<WalletDto[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
    });
    const movements = await this.movementsByWallet(
      userId,
      wallets.map((wallet) => wallet.id),
    );
    return wallets.map((wallet) => toWalletDto(wallet, movements.get(wallet.id) ?? NO_MOVEMENTS));
  }

  async create(userId: string, input: CreateWalletRequest): Promise<WalletDto> {
    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        initialBalance: moneyToBigInt(input.initialBalance),
      },
    });
    return toWalletDto(wallet, NO_MOVEMENTS);
  }

  async update(userId: string, id: string, input: UpdateWalletRequest): Promise<WalletDto> {
    // updateMany with userId in the filter: the ownership check and the write are one query,
    // so there is no window where we update a wallet we have not verified.
    const { count } = await this.prisma.wallet.updateMany({
      where: { id, userId, deletedAt: null },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.archived !== undefined && { archived: input.archived }),
        ...(input.initialBalance !== undefined && {
          initialBalance: moneyToBigInt(input.initialBalance),
        }),
      },
    });
    if (count === 0) {
      throw walletNotFound();
    }
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { id } });
    const movements = await this.movementsByWallet(userId, [id]);
    return toWalletDto(wallet, movements.get(id) ?? NO_MOVEMENTS);
  }

  /**
   * Soft delete: the wallet disappears from lists, but its transactions stay so past
   * reports do not change (docs/PROJECT_CONTEXT.md). The UI asks for confirmation first.
   */
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.wallet.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) {
      throw walletNotFound();
    }
  }

  /**
   * Movements for many wallets in two queries (not one per wallet):
   * amounts grouped by (wallet, type) for money leaving or entering through `walletId`,
   * plus transfers arriving through `toWalletId`. Soft-deleted transactions are ignored.
   */
  private async movementsByWallet(
    userId: string,
    walletIds: string[],
  ): Promise<Map<string, WalletMovements>> {
    const result = new Map<string, WalletMovements>();
    if (walletIds.length === 0) {
      return result;
    }

    const [bySource, transfersIn] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ["walletId", "type"],
        where: { userId, deletedAt: null, walletId: { in: walletIds } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ["toWalletId"],
        where: { userId, deletedAt: null, type: "TRANSFER", toWalletId: { in: walletIds } },
        _sum: { amount: true },
      }),
    ]);

    const movementsOf = (walletId: string): WalletMovements => {
      let movements = result.get(walletId);
      if (!movements) {
        movements = { ...NO_MOVEMENTS };
        result.set(walletId, movements);
      }
      return movements;
    };

    for (const row of bySource) {
      const amount = row._sum.amount ?? 0n;
      const movements = movementsOf(row.walletId);
      if (row.type === "INCOME") {
        movements.income += amount;
      } else if (row.type === "EXPENSE") {
        movements.expense += amount;
      } else {
        movements.transferOut += amount;
      }
    }
    for (const row of transfersIn) {
      if (row.toWalletId) {
        movementsOf(row.toWalletId).transferIn += row._sum.amount ?? 0n;
      }
    }
    return result;
  }
}
