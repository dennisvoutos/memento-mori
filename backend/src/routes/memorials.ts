import { Router } from 'express';
import {
  createMemorialSchema,
  updateMemorialSchema,
  createAccessSchema,
  updateAccessSchema,
} from '@memento-mori/shared';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  createMemorial,
  getUserMemorials,
  getMemorialById,
  getMemorialByAccessToken,
  updateMemorial,
  updateMemorialPhoto,
  deleteMemorial,
  getMemorialAccess,
  inviteUser,
  updateAccess,
  revokeAccess,
  getShareLink,
} from '../services/memorial.service.js';
import { param } from '../lib/params.js';
import { imageUpload, assertValidImageFile } from '../middleware/image-upload.js';
import { memorialObjectKey, processImageBuffers, putJpegObject } from '../services/r2-storage.service.js';

export const memorialsRouter = Router();

// POST /api/memorials
memorialsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = createMemorialSchema.parse(req.body);
    const memorial = await createMemorial(req.userId!, data);
    res.status(201).json(memorial);
  } catch (err) {
    next(err);
  }
});

// GET /api/memorials
memorialsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const memorials = await getUserMemorials(req.userId!);
    res.json(memorials);
  } catch (err) {
    next(err);
  }
});

// GET /api/memorials/shared/:accessToken
memorialsRouter.get(
  '/shared/:accessToken',
  optionalAuth,
  async (req, res, next) => {
    try {
      const { memorial, permission } = await getMemorialByAccessToken(
        param(req.params.accessToken),
        req.userId
      );
      res.json({ memorial, permission });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/memorials/:id
memorialsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const memorial = await getMemorialById(param(req.params.id), req.userId);
    res.json(memorial);
  } catch (err) {
    next(err);
  }
});

// PUT /api/memorials/:id
memorialsRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = updateMemorialSchema.parse(req.body);
    const memorial = await updateMemorial(param(req.params.id), req.userId!, data);
    res.json(memorial);
  } catch (err) {
    next(err);
  }
});

// POST /api/memorials/:id/photo
memorialsRouter.post(
  '/:id/photo',
  requireAuth,
  imageUpload.single('photo'),
  async (req, res, next) => {
    try {
      await assertValidImageFile(req.file);
      const memorialId = param(req.params.id);
      const objectKey = memorialObjectKey(memorialId, 'profile');
      const { originalJpeg } = await processImageBuffers(req.file!.buffer);
      await putJpegObject(objectKey, originalJpeg);

      const memorial = await updateMemorialPhoto(
        memorialId,
        req.userId!,
        objectKey
      );
      res.json(memorial);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/memorials/:id
memorialsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await deleteMemorial(param(req.params.id), req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Access Management ──

// GET /api/memorials/:id/access
memorialsRouter.get('/:id/access', requireAuth, async (req, res, next) => {
  try {
    const access = await getMemorialAccess(param(req.params.id), req.userId!);
    res.json(access);
  } catch (err) {
    next(err);
  }
});

// POST /api/memorials/:id/access
memorialsRouter.post('/:id/access', requireAuth, async (req, res, next) => {
  try {
    const data = createAccessSchema.parse(req.body);
    const access = await inviteUser(
      param(req.params.id),
      req.userId!,
      data.email,
      data.permission
    );
    res.status(201).json(access);
  } catch (err) {
    next(err);
  }
});

// GET /api/memorials/:id/share-link
memorialsRouter.get(
  '/:id/share-link',
  requireAuth,
  async (req, res, next) => {
    try {
      const accessToken = await getShareLink(param(req.params.id), req.userId!);
      res.json({ accessToken });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/memorials/:id/access/:accessId
memorialsRouter.put(
  '/:id/access/:accessId',
  requireAuth,
  async (req, res, next) => {
    try {
      const data = updateAccessSchema.parse(req.body);
      const access = await updateAccess(
        param(req.params.id),
        param(req.params.accessId),
        req.userId!,
        data.permission
      );
      res.json(access);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/memorials/:id/access/:accessId
memorialsRouter.delete(
  '/:id/access/:accessId',
  requireAuth,
  async (req, res, next) => {
    try {
      await revokeAccess(param(req.params.id), param(req.params.accessId), req.userId!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
