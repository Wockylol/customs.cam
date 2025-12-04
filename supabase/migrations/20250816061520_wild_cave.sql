/*
  # Add pending value to team_role enum

  1. Enum Updates
    - Add 'pending' value to team_role enum type
    - This allows new users to be assigned pending status during registration

  2. Changes
    - Extends existing team_role enum with new 'pending' option
    - Maintains backward compatibility with existing roles
    - Enables account approval workflow functionality
*/

ALTER TYPE public.team_role ADD VALUE 'pending';