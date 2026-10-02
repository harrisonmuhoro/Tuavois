import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { paginationMeta, parsePagination } from '../utils/pagination';

export const getLetters = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { search = '', staffId } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.letterName = { contains: search };
    if (staffId) where.createdById = staffId;
    const [letters, total] = await Promise.all([
      prisma.letter.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true } } } }),
      prisma.letter.count({ where }),
    ]);
    res.json({ success: true, data: letters, pagination: paginationMeta({ page, limit, skip }, total) });
  } catch (error) { next(error); }
};

export const getLetterById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const letter = await prisma.letter.findUnique({ where: { id: req.params.id }, include: { createdBy: { select: { id: true, name: true } } } });
    if (!letter) throw new NotFoundError('Letter');
    res.json({ success: true, data: letter });
  } catch (error) { next(error); }
};

export const createLetter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const letter = await prisma.letter.create({ data: { ...req.body, createdById: req.user!.id }, include: { createdBy: { select: { id: true, name: true } } } });
    res.status(201).json({ success: true, message: 'Letter created successfully', data: letter });
  } catch (error) { next(error); }
};

export const updateLetter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.letter.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Letter');
    const letter = await prisma.letter.update({ where: { id: existing.id }, data: req.body, include: { createdBy: { select: { id: true, name: true } } } });
    res.json({ success: true, message: 'Letter updated successfully', data: letter });
  } catch (error) { next(error); }
};

export const deleteLetter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await prisma.letter.delete({ where: { id: req.params.id } }); res.json({ success: true, message: 'Letter deleted successfully', data: null }); } catch (error) { next(error); }
};
