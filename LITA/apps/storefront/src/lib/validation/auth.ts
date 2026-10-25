import { z } from "zod";

export const registerSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Please enter your first name."),
  last_name: z
    .string()
    .trim()
    .min(1, "Please enter your last name."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
  marketing_opt_in: z.boolean().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(1, "Please enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long."),
    confirm_password: z
      .string()
      .min(8, "Please confirm your new password."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "Please enter your current password."),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters long."),
    confirm_password: z
      .string()
      .min(8, "Please confirm your new password."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match.",
    path: ["confirm_password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Please enter your first name."),
  last_name: z
    .string()
    .trim()
    .min(1, "Please enter your last name."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  marketing_opt_in: z.boolean().default(false),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
