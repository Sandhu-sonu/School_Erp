import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

export const parentSchema = z.object({
  fatherName: z.string().min(1, { message: "Father's name is required" }),
  motherName: z.string().optional().or(z.literal('')),
  mobile: z.string().regex(/^\d{10}$/, { message: 'Mobile must be a 10-digit number' }),
  alternateMobile: z
    .string()
    .regex(/^\d{10}$/, { message: 'Alternate mobile must be a 10-digit number' })
    .optional()
    .or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
});

export const studentSchema = z.object({
  name: z.string().min(1, { message: "Student's name is required" }),
  dob: z.string().refine((val) => {
    const parse = Date.parse(val);
    if (isNaN(parse)) return false;
    const age = (new Date().getTime() - parse) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 2 && age <= 100;
  }, { message: 'Student age must be between 2 and 100 years' }),
  gender: z.string().min(1, { message: 'Gender is required' }),
  photo: z.string().optional().or(z.literal('')),
  parentId: z.string().uuid({ message: 'Select a valid parent account' }),
  classId: z.string().uuid({ message: 'Select a valid class' }),
  sectionId: z.string().uuid({ message: 'Select a valid section' }).optional().or(z.literal('')),
});

export const feePlanSchema = z.object({
  sessionId: z.string().uuid(),
  classId: z.string().uuid(),
  tuitionFee: z.number().nonnegative(),
  admissionFee: z.number().nonnegative(),
});

export const expenseSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  expenseDate: z.string().refine((val) => !isNaN(Date.parse(val))),
  paidTo: z.string().min(1),
  paymentMode: z.enum(['CASH', 'CARD', 'ONLINE', 'CHEQUE']),
  notes: z.string().optional(),
});

export const transactionSchema = z.object({
  feeAccountId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMode: z.enum(['CASH', 'CARD', 'ONLINE', 'CHEQUE']),
  notes: z.string().optional(),
});
