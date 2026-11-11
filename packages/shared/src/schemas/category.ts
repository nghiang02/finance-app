import { z } from "zod";

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

/** "#RRGGBB" */
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Màu không hợp lệ");
