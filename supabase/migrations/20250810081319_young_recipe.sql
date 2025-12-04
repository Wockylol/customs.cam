/*
  # Update request_status enum to include all workflow statuses

  1. Enum Updates
    - Add 'pending_client_approval' status for client approval workflow
    - Add 'delivered' status for final delivery state
    - Maintains existing statuses: 'pending', 'in_progress', 'completed', 'cancelled'

  2. Workflow Support
    - Enables proper 5-stage workflow as designed
    - Allows granular status tracking from team approval through delivery
    - Supports client approval process
*/

-- Add new enum values to request_status
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pending_client_approval';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'delivered';