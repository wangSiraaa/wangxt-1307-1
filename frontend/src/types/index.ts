export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'ta' | 'head';
  role_display?: string;
  class_name?: string;
  phone?: string;
  is_staff: boolean;
}

export interface UserBrief {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  class_name?: string;
}

export interface Assignment {
  id: number;
  title: string;
  description?: string;
  course_name: string;
  class_name: string;
  created_by: number;
  created_by_info?: UserBrief;
  deadline: string;
  appeal_deadline: string;
  is_appeal_allowed?: boolean;
  questions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: number;
  assignment: number;
  question_no: number;
  title: string;
  max_score: string | number;
  is_subjective: boolean;
  created_at?: string;
  grading_points?: GradingPoint[];
}

export interface GradingPoint {
  id: number;
  question: number;
  description: string;
  max_score: string | number;
  sort_order: number;
  created_at?: string;
}

export interface StudentAnswer {
  id: number;
  student: number;
  student_info?: UserBrief;
  question: number;
  question_info?: Question;
  question_no?: number;
  question_max_score?: string | number;
  assignment_title?: string;
  answer_content: string;
  total_score: string | number;
  graded_by?: number;
  graded_by_info?: UserBrief;
  graded_at?: string;
  remark?: string;
  submitted_at?: string;
  has_appeal: boolean;
  affected_by_batch?: number | null;
  point_scores?: GradingPointScore[];
  score_versions_count?: number;
}

export interface GradingPointScore {
  id: number;
  student_answer: number;
  grading_point: number;
  grading_point_info?: GradingPoint;
  score: string | number;
  comment?: string;
}

export interface Appeal {
  id: number;
  student_answer: number;
  student_answer_info?: StudentAnswer;
  student: number;
  student_info?: UserBrief;
  student_name?: string;
  question_no?: number;
  assignment_title?: string;
  reason: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  status_display?: string;
  original_score?: string | number;
  new_total_score?: string | number;
  submitted_at: string;
  reviewed_by?: number;
  reviewed_by_info?: UserBrief;
  reviewed_at?: string;
  review_comment?: string;
  related_batch?: number | null;
  evidences?: AppealEvidence[];
  evidences_count?: number;
}

export interface AppealEvidence {
  id: number;
  appeal: number;
  description: string;
  file?: string;
  image?: string;
  created_at?: string;
}

export interface ScoreVersion {
  id: number;
  student_answer: number;
  version_type: 'initial' | 'appeal' | 'batch';
  version_type_display?: string;
  original_total_score: string | number;
  new_total_score: string | number;
  score_diff?: number;
  changed_by?: number;
  changed_by_info?: UserBrief;
  changed_at: string;
  reason: string;
  appeal?: number | null;
  batch_correction?: number | null;
  score_details_snapshot?: Record<string, any>;
}

export interface BatchCorrection {
  id: number;
  title: string;
  description: string;
  question: number;
  question_info?: Question;
  question_no?: number;
  assignment_title?: string;
  class_name: string;
  created_by: number;
  created_by_info?: UserBrief;
  status: 'draft' | 'executing' | 'completed' | 'rolled_back';
  status_display?: string;
  affected_grading_point?: number | null;
  affected_grading_point_info?: GradingPoint;
  rule_type: 'add' | 'subtract' | 'set' | 'percent';
  rule_type_display?: string;
  adjust_value: string | number;
  min_score_limit: string | number;
  max_score_limit?: string | number | null;
  affected_count: number;
  executed_at?: string;
  rolled_back_at?: string;
  created_at?: string;
  updated_at?: string;
  related_appeals_count?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TokenResponse {
  access: string;
  refresh: string;
}
