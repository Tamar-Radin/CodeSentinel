import { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import type { FeedbackInput } from "../schemas/feedback";
import type { Feedback, ApiResponse } from "@architect/shared";

const feedbackStore: Feedback[] = [];

export const createFeedback = asyncHandler(async (req, res: Response<ApiResponse<Feedback>>) => {
  const { name, email, message } = req.body as FeedbackInput;

  const feedback: Feedback = {
    id: `f_${Date.now()}`,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  };

  feedbackStore.push(feedback);

  res.status(201).json({
    data: feedback,
    message: "הפנייה נשלחה בהצלחה",
  });
});
