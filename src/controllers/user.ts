import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { sendEmail } from '../services/email';
import { resetPasswordTemplate } from '../templates/users/resetPassword';
import { signUpTemplate } from '../templates/users/signup';

// SignUp
export const signUp = async (req: Request, res: Response) => {
  try {
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ ...req.body, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      {
        expiresIn: '24d',
      },
    );

    const activationLink = `${process.env.BASE_URL}/activate?token=${token}`;

    await sendEmail(
      user.email,
      'Welcome to Our Service!',
      signUpTemplate(user.username, activationLink),
    );

    res.status(201).json({
      message:
        'Registration successful! Please check your email to activate your account.',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// SignIn
export const signIn = async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({
      message: 'The provided credentials are invalid.',
    });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '24d',
    },
  );

  res.json({ token });
};

// Change Password
export const changePassword = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(req.body.oldPassword, user.password))) {
      return res.status(401).json({
        message: 'The provided credentials are invalid.',
      });
    }

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    res.json({ message: 'Your password has been updated successfully.' });
  } catch (error: any) {
    res.status(500).json({
      error: 'An unexpected error occurred while processing your request.',
      details: error.message,
    });
  }
};

// Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      message: 'No user found with the provided email address.',
    });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '24d',
    },
  );

  const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;

  await sendEmail(
    user.email,
    'Password Reset Request',
    resetPasswordTemplate(resetLink),
  );

  res.json({
    message: 'A password reset link has been sent to your email address.',
  });
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message:
          'User not found. Please verify that you are using the correct details and try again.',
      });
    }

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    res.status(200).json({
      message: 'Your password has been reset successfully.',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'An unexpected error occurred while resetting the password.',
      details: error.message,
    });
  }
};

// Update User
export const updateUser = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message:
          'User not found. Please verify that you are using the correct details and try again.',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userData } = req.body;
    await user.set(userData).save();

    res.json({ message: 'Your profile has been updated successfully.' });
  } catch (error: any) {
    res.status(500).json({
      error: 'An unexpected error occurred while processing your request.',
      details: error.message,
    });
  }
};

// Delete User
export const deleteUser = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message:
          'User not found. Please verify that you are using the correct details and try again.',
      });
    }

    await User.deleteOne({ _id: req.userId });

    res.status(200).json({
      message: 'User has been deleted successfully.',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'An unexpected error occurred while deleting the user.',
      details: error.message,
    });
  }
};

// My Account
export const myAccount = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message:
          'User not found. Please verify that you are using the correct details and try again.',
      });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({
      error: 'An unexpected error occurred while fetching the user.',
      details: error.message,
    });
  }
};

// View User by ID
export const viewByID = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found. Please verify the user ID and try again.',
      });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({
      error: 'An unexpected error occurred while fetching the user.',
      details: error.message,
    });
  }
};

// Search Users
export const searchUsers = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { q, status, role } = req.query;
    const query: any = {};

    if (q) {
      let searchString: string;

      if (typeof q === 'string') {
        searchString = q;
      } else if (Array.isArray(q)) {
        searchString = q.join(' ');
      } else {
        throw new Error('Invalid query parameter');
      }

      const regex = new RegExp(searchString, 'i');
      query.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }

    if (status) {
      query.status = status;
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query);
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({
      error:
        'An unexpected error occurred while searching and filtering users.',
      details: error.message,
    });
  }
};
