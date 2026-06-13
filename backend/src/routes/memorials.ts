import { Router } from 'express';
import {
  createMemorialSchema,
  updateMemorialSchema,
  createAccessSchema,
  updateAccessSchema,
} from '@memento-mori/shared';
import { requireVerifiedUser, optionalAuth } from '../middleware/auth.js';
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
import { paramUUID } from '../lib/params.js';
import { imageUpload, assertValidImageFile } from '../middleware/image-upload.js';
import { memorialObjectKey, processImageBuffers, putJpegObject } from '../services/r2-storage.service.js';

export const memorialsRouter = Router();

// POST /api/memorials
memorialsRouter.post('/', requireVerifiedUser, async (req, res, next) => {
  try {
    const data = createMemorialSchema.parse(req.body);
    const memorial = await createMemorial(req.userId!, data);
    res.status(201).json(memorial);
  } catch (err) {
    next(err);
  }
});

// GET /api/memorials
memorialsRouter.get('/', requireVerifiedUser, async (req, res, next) => {
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
        paramUUID(req.params.accessToken),
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
    const memorial = await getMemorialById(paramUUID(req.params.id), req.userId);
    res.json(memorial);
  } catch (err) {
    next(err);
  }
});

// PUT /api/memorials/:id
memorialsRouter.put('/:id', requireVerifiedUser, async (req, res, next) => {
  try {
    const data = updateMemorialSchema.parse(req.body);
    const memorial = await updateMemorial(paramUUID(req.params.id), req.userId!, data);
    res.json(memorial);
  } catch (err) {
    next(err);
  }
});

// POST /api/memorials/:id/photo
memorialsRouter.post(
  '/:id/photo',
  requireVerifiedUser,
  imageUpload.single('photo'),
  async (req, res, next) => {
    try {
      await assertValidImageFile(req.file);
      const memorialId = paramUUID(req.params.id);
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
memorialsRouter.delete('/:id', requireVerifiedUser, async (req, res, next) => {
  try {
    await deleteMemorial(paramUUID(req.params.id), req.userId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Access Management ──

// GET /api/memorials/:id/access
memorialsRouter.get('/:id/access', requireVerifiedUser, async (req, res, next) => {
  try {
    const access = await getMemorialAccess(paramUUID(req.params.id), req.userId!);
    res.json(access);
  } catch (err) {
    next(err);
  }
});

// POST /api/memorials/:id/access
memorialsRouter.post('/:id/access', requireVerifiedUser, async (req, res, next) => {
  try {
    const data = createAccessSchema.parse(req.body);
    const access = await inviteUser(
      paramUUID(req.params.id),
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
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      const accessToken = await getShareLink(paramUUID(req.params.id), req.userId!);
      res.json({ accessToken });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/memorials/:id/access/:accessId
memorialsRouter.put(
  '/:id/access/:accessId',
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      const data = updateAccessSchema.parse(req.body);
      const access = await updateAccess(
        paramUUID(req.params.id),
        paramUUID(req.params.accessId),
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
  requireVerifiedUser,
  async (req, res, next) => {
    try {
      await revokeAccess(paramUUID(req.params.id), paramUUID(req.params.accessId), req.userId!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
