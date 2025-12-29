-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.email_templates (name, subject, html_content, text_content, description, variables) VALUES
(
  'welcome',
  'Welcome to {{app_name}}! 🎉',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #6366f1;">Welcome, {{user_name}}! 🎉</h1>
    <p>Thank you for joining <strong>{{app_name}}</strong>. We''re excited to have you on board!</p>
    <p>Your account has been created successfully with the email: <strong>{{user_email}}</strong></p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Getting Started:</strong></p>
      <ul style="margin: 10px 0;">
        <li>Explore our features</li>
        <li>Customize your profile</li>
        <li>Start creating amazing things</li>
      </ul>
    </div>
    <p>If you have any questions, feel free to reach out!</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="color: #6b7280; font-size: 12px;">© {{app_name}}. All rights reserved.</p>
  </div>',
  'Welcome, {{user_name}}! Thank you for joining {{app_name}}. Your account has been created with email: {{user_email}}',
  'Sent when a new user registers',
  '["app_name", "user_name", "user_email"]'
),
(
  'login_notification',
  'New Login to Your Account',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #6366f1;">New Login Detected</h1>
    <p>Hello {{user_name}},</p>
    <p>We detected a new login to your {{app_name}} account.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px;"><strong>Login Details:</strong></p>
      <p style="margin: 5px 0;">📧 Email: {{user_email}}</p>
      <p style="margin: 5px 0;">🕐 Time: {{login_time}}</p>
    </div>
    <p>If this was you, no action is needed.</p>
    <p style="color: #dc2626;">If you didn''t login, please secure your account immediately.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="color: #6b7280; font-size: 12px;">© {{app_name}}. All rights reserved.</p>
  </div>',
  'New login detected for your {{app_name}} account at {{login_time}}. Email: {{user_email}}',
  'Sent when a user logs in',
  '["app_name", "user_name", "user_email", "login_time"]'
),
(
  'password_reset',
  'Reset Your Password',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #6366f1;">Password Reset Request</h1>
    <p>Hello {{user_name}},</p>
    <p>We received a request to reset the password for your {{app_name}} account.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{reset_link}}" style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
    </div>
    <p>If you didn''t request this, you can safely ignore this email.</p>
    <p style="color: #6b7280; font-size: 12px;">This link will expire in 24 hours.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="color: #6b7280; font-size: 12px;">© {{app_name}}. All rights reserved.</p>
  </div>',
  'Reset your {{app_name}} password by clicking the link: {{reset_link}}',
  'Sent when user requests password reset',
  '["app_name", "user_name", "reset_link"]'
);