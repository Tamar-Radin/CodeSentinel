import mongoose, { Document, Schema, Types } from "mongoose";
import type { OrderStatus } from "@architect/shared";

// ייצוא מחדש לנוחות מודולים אחרים בשרת
export type { OrderStatus };

// ממשק TypeScript שמייצג מסמך Order ב-MongoDB
export interface IOrder extends Document {
  customer: Types.ObjectId;
  items: Types.ObjectId[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "cancelled", "returned"] as OrderStatus[],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
