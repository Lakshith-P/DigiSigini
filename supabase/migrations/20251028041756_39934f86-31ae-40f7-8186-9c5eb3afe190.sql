-- Create INSERT policy for audit_logs
-- Users can insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);