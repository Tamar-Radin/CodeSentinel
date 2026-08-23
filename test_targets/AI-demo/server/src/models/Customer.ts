import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import type { UserRole } from "@architect/shared";

// ממשק TypeScript שמייצג מסמך Customer ב-MongoDB
export interface ICustomer extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  address?: string;
  phone?: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const customerSchema = new Schema<ICustomer>({
  name: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // ⚠️ קריטי: לא מוחזר בשאילתה רגילה
  },
  role: {
    type: String,
    enum: ["admin", "manager", "user"],
    default: "user",
    index: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// hashing אוטומטי לפני שמירה - רק אם הסיסמה השתנתה ועוד לא הוצפנה
customerSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  // הגנה: אם הסיסמה כבר נראית כ-bcrypt hash, לא מצפינים שוב
  if (this.password.startsWith("$2")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

customerSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const Customer = mongoose.model<ICustomer>("Customer", customerSchema);

export default Customer;
