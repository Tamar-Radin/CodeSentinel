/** טיפוסי Contact / Feedback - משותף לקליינט ולשרת */

export interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string; // ISO 8601
}

export interface FeedbackRequest {
  name: string;
  email: string;
  message: string;
}
