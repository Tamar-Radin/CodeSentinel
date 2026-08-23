import { Router } from "express";
import { createFeedback } from "../controllers/Feedback";
import { validate } from "../middleware/validate";
import { feedbackSchema } from "../schemas/feedback";

const router = Router();

router.post("/", validate(feedbackSchema), createFeedback);

export default router;
