export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'chatter' | 'pending';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface Client {
  id: string;
  username: string;
  phone?: string;
  assigned_chatter_id?: string;
  assigned_manager_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Custom {
  id: string;
  clientId: string;
  fanName: string;
  fanEmail?: string;
  description: string;
  dateSubmitted: string;
  proposedAmount: number;
  amountPaid?: number;
  lengthDuration?: string;
  status: 'pending_team_approval' | 'pending_client_approval' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  chatLink?: string;
  dateDue?: string;
  dateCompleted?: string;
  estimatedDeliveryDate?: string;
  assignedTo?: string;
  createdBy?: string;
  teamApprovedBy?: string;
  teamApprovedAt?: string;
  clientApprovedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentUpload {
  id: string;
  customRequestId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadDate: string;
}

export interface ActivityLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'created' | 'updated' | 'deleted';
  oldValues?: any;
  newValues?: any;
  performedBy?: string;
  performedAt: string;
}

export interface DashboardStats {
  totalCustoms: number;
  pendingCustoms: number;
  inProgressCustoms: number;
  completedCustoms: number;
}

export interface SceneInstruction {
  type: 'video' | 'photo';
  number: number;
  duration?: string;
  description: string;
}

export interface ContentScene {
  id: string;
  title: string;
  location: string | null;
  props: string | null;
  instructions: SceneInstruction[];
  is_template: boolean;
  is_default_for_new_clients: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientSceneAssignment {
  id: string;
  client_id: string;
  scene_id: string;
  status: 'pending' | 'completed';
  assigned_by: string | null;
  assigned_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SceneContentUpload {
  id: string;
  assignment_id: string;
  step_index: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  upload_date: string;
  uploaded_at: string;
  public_url?: string | null;
}

export interface SceneExampleMedia {
  id: string;
  scene_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  display_order: number;
  created_at: string;
}