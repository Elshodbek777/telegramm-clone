import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { MockAuthService } from '../services/auth.service.mock';
import { registerRequestSchema, verifyRequestSchema } from '../utils/validation';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const USE_MOCK = process.env.USE_MOCK === 'true' || true;
const authService = USE_MOCK ? new MockAuthService() : new AuthService();

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = registerRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('VAL_001', validation.error.errors[0].message, 400);
    }

    const result = await authService.register(validation.data);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/verify
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = verifyRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError('VAL_001', validation.error.errors[0].message, 400);
    }

    const deviceInfo = {
      deviceId: req.body.deviceId || uuidv4(),
      deviceName: req.headers['user-agent'] || 'Unknown',
      deviceType: req.body.deviceType || 'web',
      ipAddress: req.ip,
    };

    const result = await authService.verify(validation.data, deviceInfo);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
