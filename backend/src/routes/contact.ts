import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { sendContactEmail } from '../services/email.service.js';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export const contactRouter = Router();

contactRouter.post('/', optionalAuth, async (req, res, _next) => {
  try {
    const data = contactSchema.parse(req.body);

    // If user is logged in, we can cross-reference
    let userId: string | null = null;
    if (req.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (user) userId = user.id;
    }

    await sendContactEmail({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      userId,
    });

    res.json({ message: 'Your message has been sent successfully.' });
  } catch (err) {
    console.error('Contact route error:', err);
    // Return the error message during local development for debugging.
    // In production, prefer a generic error message and avoid leaking internal details.
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
});
