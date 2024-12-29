import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: 'Authentication failed: No token was provided.' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as jwt.JwtPayload;

    req.userId = decoded.id || '';
    req.role = decoded.role || '';

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(401)
        .json({ message: 'Authentication failed: Invalid token provided.' });
    }

    return res.status(500).json({
      message:
        'Authentication failed: An internal server error occurred. Please try again later.',
    });
  }
};
